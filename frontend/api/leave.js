import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (!global.leaveRequests || global.leaveRequests.length === 0) {
        try {
            ensureDataDir();
            const leaveFilePath = path.join(process.cwd(), 'cloud-data', 'leave_data.json');
            if (fs.existsSync(leaveFilePath)) {
                const fileData = fs.readFileSync(leaveFilePath, 'utf8');
                global.leaveRequests = JSON.parse(fileData);
                console.log(`✅ Loaded ${global.leaveRequests.length} leave requests`);
            } else {
                global.leaveRequests = generateSampleLeaveData();
                console.log('⚠️ No leave file found, using sample data');
            }
        } catch (error) {
            console.error('❌ Error loading leave requests:', error);
            global.leaveRequests = generateSampleLeaveData();
        }
    }
    
    if (req.method === 'GET') {
        const { branch, userId, status } = req.query;
        let filtered = [...global.leaveRequests];
        
        if (branch) filtered = filtered.filter(l => l.branch === branch);
        if (userId) filtered = filtered.filter(l => l.userId === userId);
        if (status) filtered = filtered.filter(l => l.status === status);
        
        res.status(200).json(filtered);
    } else if (req.method === 'POST') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const body = req.body || {};
        // Basic policy validation
        const days = calcDays(body.startDate, body.endDate, body.halfDay);
        const policy = getEmployeePolicy(body.userId);
        if (!policy) { res.status(400).json({ error: 'Unknown employee for entitlement check' }); return; }
        if (!body.userId || !body.fullName || !body.branch || !body.type || !body.startDate || !body.endDate) {
            res.status(400).json({ error: 'Missing required fields' }); return;
        }
        if (hasOverlap(body.userId, body.startDate, body.endDate)) {
            res.status(400).json({ error: 'Overlapping leave request exists for this period' }); return;
        }
        const used = getUsedLeaveDays(body.userId, body.type);
        const allowed = getAllowedDays(policy, body.type);
        if (allowed != null && used + days > allowed) {
            res.status(400).json({ error: `Insufficient ${body.type} leave. Used ${used}, requested ${days}, allowed ${allowed}` });
            return;
        }
        const newLeave = {
            id: `LEAVE-${Date.now()}`,
            userId: body.userId,
            fullName: body.fullName,
            branch: body.branch,
            type: body.type,
            startDate: body.startDate,
            endDate: body.endDate,
            halfDay: !!body.halfDay,
            days,
            status: 'pending',
            reason: body.reason || '',
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            managerApproval: { status:'pending', approvedBy:null, approvedAt:null, notes:'' },
            hrApproval: { status:'pending', approvedBy:null, approvedAt:null, notes:'' }
        };
        global.leaveRequests.push(newLeave);
        saveLeaveToFile();
        writeAudit('leave_submitted', { id: newLeave.id, userId: newLeave.userId, type: newLeave.type, days });
        notify({ type:'leave_submitted', title:'Leave Submitted', message:`${newLeave.fullName} requested ${newLeave.days} day(s) ${newLeave.type}`, refId:newLeave.id });
        res.status(201).json(newLeave);
    } else if (req.method === 'PUT') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const { id, action, notes, ...updateData } = req.body;
        const index = global.leaveRequests.findIndex(l => l.id === id);
        if (index !== -1) {
            const current = global.leaveRequests[index];
            if (action === 'managerApprove') {
                current.managerApproval = { status:'approved', approvedBy: (updateData.approvedBy||'Manager'), approvedAt:new Date().toISOString(), notes: notes||'' };
                current.status = 'manager_approved';
                writeAudit('leave_manager_approved', { id, approvedBy: current.managerApproval.approvedBy });
                notify({ type:'leave_manager_approved', title:'Leave Manager Approved', message:`${current.fullName} ${current.type} approved by manager`, refId:id });
            } else if (action === 'managerReject') {
                current.managerApproval = { status:'rejected', approvedBy: (updateData.approvedBy||'Manager'), approvedAt:new Date().toISOString(), notes: notes||'' };
                current.status = 'rejected';
                writeAudit('leave_manager_rejected', { id, approvedBy: current.managerApproval.approvedBy });
                notify({ type:'leave_manager_rejected', title:'Leave Rejected', message:`${current.fullName} ${current.type} rejected by manager`, refId:id });
            } else if (action === 'hrApprove') {
                current.hrApproval = { status:'approved', approvedBy: (updateData.approvedBy||'HR'), approvedAt:new Date().toISOString(), notes: notes||'' };
                current.status = 'approved';
                writeAudit('leave_hr_approved', { id, approvedBy: current.hrApproval.approvedBy });
                notify({ type:'leave_hr_approved', title:'Leave HR Approved', message:`${current.fullName} ${current.type} approved by HR`, refId:id });
            } else if (action === 'hrReject') {
                current.hrApproval = { status:'rejected', approvedBy: (updateData.approvedBy||'HR'), approvedAt:new Date().toISOString(), notes: notes||'' };
                current.status = 'rejected';
                writeAudit('leave_hr_rejected', { id, approvedBy: current.hrApproval.approvedBy });
                notify({ type:'leave_hr_rejected', title:'Leave HR Rejected', message:`${current.fullName} ${current.type} rejected by HR`, refId:id });
            } else {
                Object.assign(current, updateData);
            }
            global.leaveRequests[index] = current;
            saveLeaveToFile();
            res.status(200).json(global.leaveRequests[index]);
        } else {
            res.status(404).json({ error: 'Leave request not found' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
        const idx = global.leaveRequests.findIndex(l => l.id === id);
        if (idx !== -1) {
            const removed = global.leaveRequests.splice(idx, 1)[0];
            saveLeaveToFile();
            res.status(200).json({ success: true, deleted: removed.id });
        } else {
            res.status(404).json({ error: 'Leave request not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function saveLeaveToFile() {
    try {
        ensureDataDir();
        const leaveFilePath = path.join(process.cwd(), 'cloud-data', 'leave_data.json');
        fs.writeFileSync(leaveFilePath, JSON.stringify(global.leaveRequests, null, 2));
    } catch (error) {
        console.error('❌ Error saving leave:', error);
    }
}

function generateSampleLeaveData() {
    return [
        {
            id: 'LEAVE-001',
            userId: 'STAFF-TOWNSHOP-1',
            fullName: 'Jennifer Joseph',
            branch: 'townshop',
            type: 'Annual',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days: 7,
            status: 'pending',
            reason: 'Family vacation',
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'LEAVE-002',
            userId: 'STAFF-KHOMASDAL-2',
            fullName: 'Staff Member 2 - Khomasdal',
            branch: 'khomasdal',
            type: 'Sick',
            startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days: 2,
            status: 'approved',
            reason: 'Medical appointment',
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            approvedBy: 'Manager',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'LEAVE-003',
            userId: 'STAFF-SWAKOPMUND-1',
            fullName: 'Staff Member 1 - Swakopmund',
            branch: 'swakopmund',
            type: 'Maternity',
            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days: 90,
            status: 'active',
            reason: 'Maternity leave',
            submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            approvedBy: 'HR Manager',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
}

function calcDays(start, end, halfDay) {
    if (!start || !end) return 0;
    const ms = (new Date(end) - new Date(start));
    const days = Math.floor(ms/(1000*60*60*24)) + 1;
    return Math.max(0, days) - (halfDay ? 0.5 : 0);
}
function getEmployeePolicy(userId){
    try {
        ensureDataDir();
        const fp = path.join(process.cwd(),'cloud-data','employees_data.json');
        if (!fs.existsSync(fp)) return null;
        const list = JSON.parse(fs.readFileSync(fp,'utf8'));
        return list.find(e => e.userId === userId) || null;
    } catch(e){ return null; }
}
function getAllowedDays(policy, type){
    const ent = policy && policy.leaveEntitlements || {};
    if (type === 'Annual') return ent.annual || 24;
    if (type === 'Sick') return ent.sick || 10;
    return null; // other types unlimited or handled externally
}
function getUsedLeaveDays(userId, type){
    return (global.leaveRequests||[]).filter(l => l.userId===userId && l.type===type && (l.status==='approved' || l.status==='active' || l.status==='manager_approved')).reduce((s,l)=> s + (Number(l.days)||0), 0);
}
function writeAudit(event, details){
    try {
        ensureDataDir();
        const fp = path.join(process.cwd(),'cloud-data','hr_audit.json');
        const list = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp,'utf8')) : [];
        list.push({ id:`AUD-${Date.now()}`, event, details, at:new Date().toISOString() });
        fs.writeFileSync(fp, JSON.stringify(list, null, 2));
    } catch(e){}
}
function notify(n){
    try {
        ensureDataDir();
        const fp = path.join(process.cwd(),'cloud-data','notifications_data.json');
        const list = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp,'utf8')) : [];
        list.push({ id:`NTF-${Date.now()}`, ...n, createdAt:new Date().toISOString(), read:false });
        fs.writeFileSync(fp, JSON.stringify(list, null, 2));
    } catch(e){}
}

function hasOverlap(userId, startDate, endDate){
    const s = new Date(startDate).toISOString().split('T')[0];
    const e = new Date(endDate).toISOString().split('T')[0];
    const statuses = new Set(['pending','manager_approved','approved','active']);
    return (global.leaveRequests||[]).some(l => l.userId===userId && statuses.has(l.status) && !(l.endDate < s || l.startDate > e));
}
function ensureDataDir(){
    const dir = path.join(process.cwd(), 'cloud-data');
    if (!fs.existsSync(dir)) { try { fs.mkdirSync(dir); } catch(e){} }
}
function isHR(req){
    const role = req.headers['x-role'] || req.headers['x-user-role'];
    return ['hr_manager','hr_admin','admin'].includes(String(role||'').toLowerCase());
}
