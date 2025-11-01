import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    if (!global.shifts || global.shifts.length === 0) {
        try {
            ensureDataDir();
            const fp = filePath();
            if (fs.existsSync(fp)) { global.shifts = JSON.parse(fs.readFileSync(fp, 'utf8')); }
            else { global.shifts = sample(); }
            console.log(`✅ Loaded ${global.shifts.length} shifts`);
        } catch (e) {
            console.error('❌ Error loading shifts:', e); global.shifts = sample();
        }
    }

    if (req.method === 'GET') {
        const { branch, userId, startDate, endDate, status } = req.query;
        let list = [...global.shifts];
        if (branch) list = list.filter(s => s.branch === branch);
        if (userId) list = list.filter(s => s.userId === userId);
        if (status) list = list.filter(s => s.status === status);
        if (startDate && endDate) list = list.filter(s => s.date >= startDate && s.date <= endDate);
        res.status(200).json(list);
    } else if (req.method === 'POST') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const body = req.body || {};
        if (!body.userId || !body.fullName || !body.branch || !body.date) { res.status(400).json({ error: 'Missing required fields: userId, fullName, branch, date' }); return; }
        const rec = {
            id: `SHF-${Date.now()}`,
            userId: body.userId,
            fullName: body.fullName,
            branch: body.branch,
            date: body.date, // YYYY-MM-DD
            startTime: body.startTime || '08:00',
            endTime: body.endTime || '17:00',
            status: body.status || 'scheduled', // scheduled|completed|swap_requested|swap_approved
            notes: body.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // swap request fields
            swap: body.swap || { requestedBy: null, requestedAt: null, targetUserId: null, approvedBy: null, approvedAt: null }
        };
        global.shifts.push(rec);
        save();
        writeAudit('shift_created', { id: rec.id, userId: rec.userId, date: rec.date });
        res.status(201).json(rec);
    } else if (req.method === 'PUT') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const { id, ...rest } = req.body || {};
        const idx = global.shifts.findIndex(s => s.id === id);
        if (idx === -1) { res.status(404).json({ error: 'Shift not found' }); return; }
        global.shifts[idx] = { ...global.shifts[idx], ...rest, updatedAt: new Date().toISOString() };
        save();
        writeAudit('shift_updated', { id });
        res.status(200).json(global.shifts[idx]);
    } else if (req.method === 'DELETE') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const { id } = req.query;
        if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
        const idx = global.shifts.findIndex(s => s.id === id);
        if (idx === -1) { res.status(404).json({ error: 'Shift not found' }); return; }
        const removed = global.shifts.splice(idx,1)[0];
        save();
        writeAudit('shift_deleted', { id: removed.id });
        res.status(200).json({ success: true, deleted: removed.id });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function filePath(){ return path.join(process.cwd(), 'cloud-data', 'shifts_data.json'); }
function save(){ try { ensureDataDir(); fs.writeFileSync(filePath(), JSON.stringify(global.shifts, null, 2)); } catch(e){ console.error('❌ Error saving shifts:', e); } }
function sample(){
    const today = new Date().toISOString().split('T')[0];
    return [
        { id:'SHF-001', userId:'STAFF-TOWNSHOP-1', fullName:'Jennifer Joseph', branch:'townshop', date: today, startTime:'08:00', endTime:'17:00', status:'scheduled', notes:'Front desk', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), swap:{ requestedBy:null, requestedAt:null, targetUserId:null, approvedBy:null, approvedAt:null } }
    ];
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
function ensureDataDir(){ const dir = path.join(process.cwd(),'cloud-data'); if (!fs.existsSync(dir)) { try { fs.mkdirSync(dir); } catch(e){} } }
function isHR(req){ const role = req.headers['x-role'] || req.headers['x-user-role']; return ['hr_manager','hr_admin','admin'].includes(String(role||'').toLowerCase()); }


