import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    if (!global.employees || global.employees.length === 0) {
        try {
            const fp = getFilePath();
            if (fs.existsSync(fp)) {
                const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
                global.employees = data;
                console.log(`✅ Loaded ${global.employees.length} employees`);
            } else {
                global.employees = sampleEmployees();
                console.log('⚠️ No employees file found, using sample data');
            }
        } catch (e) {
            console.error('❌ Error loading employees:', e);
            global.employees = sampleEmployees();
        }
    }

    if (req.method === 'GET') {
        const { branch, role, status, q } = req.query;
        let list = [...global.employees];
        if (branch) list = list.filter(e => e.branch === branch || (e.branches||[]).includes(branch));
        if (role) list = list.filter(e => e.role === role);
        if (status) list = list.filter(e => (e.employmentStatus||'active') === status);
        if (q) {
            const needle = String(q).toLowerCase();
            list = list.filter(e => [e.fullName, e.userId, e.email, e.phone].filter(Boolean).some(v => String(v).toLowerCase().includes(needle)));
        }
        res.status(200).json(list);
    } else if (req.method === 'POST') {
        const body = req.body || {};
        const item = {
            id: `EMP-${Date.now()}`,
            userId: body.userId || `STAFF-${Date.now()}`,
            fullName: body.fullName,
            role: body.role || 'staff',
            branch: body.branch || 'townshop',
            branches: body.branches || [body.branch || 'townshop'],
            supervisorId: body.supervisorId || null,
            email: body.email || '',
            phone: body.phone || '',
            hireDate: body.hireDate || new Date().toISOString().split('T')[0],
            employmentStatus: body.employmentStatus || 'active',
            leaveEntitlements: body.leaveEntitlements || { annual: 24, sick: 10 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        global.employees.push(item);
        save();
        writeAudit('employee_created', { id: item.id, userId: item.userId, role: item.role });
        res.status(201).json(item);
    } else if (req.method === 'PUT') {
        const { id, ...rest } = req.body || {};
        const idx = global.employees.findIndex(e => e.id === id);
        if (idx === -1) { res.status(404).json({ error: 'Employee not found' }); return; }
        global.employees[idx] = { ...global.employees[idx], ...rest, updatedAt: new Date().toISOString() };
        save(); writeAudit('employee_updated', { id });
        res.status(200).json(global.employees[idx]);
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
        const idx = global.employees.findIndex(e => e.id === id);
        if (idx === -1) { res.status(404).json({ error: 'Employee not found' }); return; }
        const removed = global.employees.splice(idx,1)[0];
        save(); writeAudit('employee_deleted', { id: removed.id });
        res.status(200).json({ success: true, deleted: removed.id });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function getFilePath(){ return path.join(process.cwd(), 'cloud-data', 'employees_data.json'); }
function save(){
    try { fs.writeFileSync(getFilePath(), JSON.stringify(global.employees, null, 2)); }
    catch(e){ console.error('❌ Error saving employees:', e); }
}
function sampleEmployees(){
    return [
        { id:'EMP-001', userId:'STAFF-TOWNSHOP-1', fullName:'Jennifer Joseph', role:'consultant', branch:'townshop', branches:['townshop','khomasdal'], email:'jennifer@example.com', phone:'', hireDate:'2023-01-15', employmentStatus:'active', leaveEntitlements:{ annual:24, sick:10 }, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
        { id:'EMP-002', userId:'STAFF-KHOMASDAL-2', fullName:'NAEM HANGULA', role:'dispenser', branch:'khomasdal', branches:['khomasdal'], email:'naem@example.com', phone:'', hireDate:'2022-09-01', employmentStatus:'active', leaveEntitlements:{ annual:24, sick:10 }, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
    ];
}

function writeAudit(event, details){
    try {
        const fp = path.join(process.cwd(),'cloud-data','hr_audit.json');
        const list = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp,'utf8')) : [];
        list.push({ id:`AUD-${Date.now()}`, event, details, at:new Date().toISOString() });
        fs.writeFileSync(fp, JSON.stringify(list, null, 2));
    } catch(e){}
}


