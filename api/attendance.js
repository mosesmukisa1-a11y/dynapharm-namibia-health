import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Load attendance data from file
    if (!global.attendance || global.attendance.length === 0) {
        try {
            // Try multiple possible paths for Vercel serverless environment
            const possiblePaths = [
                path.join(process.cwd(), 'cloud-data', 'attendance_data.json'),
                path.join('/var/task', 'cloud-data', 'attendance_data.json'),
                path.join(process.cwd(), 'attendance_data.json')
            ];
            
            let loaded = false;
            for (const attendanceFilePath of possiblePaths) {
                try {
                    if (fs.existsSync(attendanceFilePath)) {
                        const fileData = fs.readFileSync(attendanceFilePath, 'utf8');
                        global.attendance = JSON.parse(fileData);
                        console.log(`✅ Loaded ${global.attendance.length} attendance records from ${attendanceFilePath}`);
                        loaded = true;
                        break;
                    }
                } catch (fileError) {
                    // Try next path
                    continue;
                }
            }
            
            if (!loaded) {
                // Generate sample data if file not found
                try {
                    global.attendance = generateSampleAttendanceData();
                    console.log('⚠️ No attendance file found, using sample data');
                } catch (sampleError) {
                    console.error('❌ Error generating sample attendance data:', sampleError);
                    global.attendance = [];
                }
            }
        } catch (error) {
            console.error('❌ Error loading attendance:', error);
            // Return empty array on error instead of crashing
            global.attendance = [];
        }
    }
    
    // Ensure attendance is always an array
    if (!Array.isArray(global.attendance)) {
        global.attendance = [];
    }
    
    if (req.method === 'GET') {
        try {
            const { branch, userId, date, startDate, endDate } = req.query;
            let filtered = Array.isArray(global.attendance) ? [...global.attendance] : [];
            
            if (branch) {
                filtered = filtered.filter(a => a && a.branch === branch);
            }
            if (userId) {
                filtered = filtered.filter(a => a && a.userId === userId);
            }
            if (date) {
                filtered = filtered.filter(a => a && a.date === date);
            }
            if (startDate && endDate) {
                filtered = filtered.filter(a => a && a.date && a.date >= startDate && a.date <= endDate);
            }
            
            res.status(200).json(filtered);
        } catch (error) {
            console.error('❌ Error in GET /attendance:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
        return;
    } else if (req.method === 'POST') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const body = req.body || {};
        if (!body.userId || !body.fullName || !body.branch || !body.date) { res.status(400).json({ error: 'Missing required fields: userId, fullName, branch, date' }); return; }
        const newAttendance = {
            id: `ATT-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString()
        };
        global.attendance.push(newAttendance);
        
        // Save to file
        saveAttendanceToFile();
        writeAudit('attendance_created', { id: newAttendance.id, userId: newAttendance.userId, branch: newAttendance.branch, date: newAttendance.date });
        
        res.status(201).json(newAttendance);
    } else if (req.method === 'PUT') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const { id, ...updateData } = req.body;
        const attendanceIndex = global.attendance.findIndex(a => a.id === id);
        if (attendanceIndex !== -1) {
            global.attendance[attendanceIndex] = { ...global.attendance[attendanceIndex], ...updateData };
            saveAttendanceToFile();
            writeAudit('attendance_updated', { id, update: Object.keys(updateData) });
            res.status(200).json(global.attendance[attendanceIndex]);
        } else {
            res.status(404).json({ error: 'Attendance record not found' });
        }
    } else if (req.method === 'DELETE') {
        if (!isHR(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
        const { id } = req.query;
        if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
        const idx = global.attendance.findIndex(a => a.id === id);
        if (idx !== -1) {
            const removed = global.attendance.splice(idx, 1)[0];
            saveAttendanceToFile();
            writeAudit('attendance_deleted', { id: removed.id });
            res.status(200).json({ success: true, deleted: removed.id });
        } else {
            res.status(404).json({ error: 'Attendance record not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function saveAttendanceToFile() {
    try {
        ensureDataDir();
        const attendanceFilePath = path.join(process.cwd(), 'cloud-data', 'attendance_data.json');
        fs.writeFileSync(attendanceFilePath, JSON.stringify(global.attendance, null, 2));
    } catch (error) {
        console.error('❌ Error saving attendance:', error);
    }
}

function generateSampleAttendanceData() {
    const today = new Date();
    const attendance = [];
    const branches = ['townshop', 'khomasdal', 'katima', 'swakopmund', 'walvisbay'];
    const userRoles = ['consultant', 'dispenser', 'manager', 'admin'];
    
    for (let i = -30; i <= 0; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        branches.forEach(branch => {
            for (let staffNum = 1; staffNum <= 5; staffNum++) {
                const status = Math.random() > 0.1 ? 'present' : (Math.random() > 0.5 ? 'absent' : 'late');
                attendance.push({
                    id: `ATT-${Date.now()}-${staffNum}`,
                    userId: `STAFF-${branch.toUpperCase()}-${staffNum}`,
                    fullName: `Staff Member ${staffNum} - ${branch}`,
                    branch: branch,
                    date: dateStr,
                    checkIn: status === 'present' ? `08:${Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` : null,
                    checkOut: status === 'present' ? `17:${Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` : null,
                    status: status,
                    createdAt: date.toISOString()
                });
            }
        }
    }
    
    return attendance;
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

function ensureDataDir(){
    const dir = path.join(process.cwd(), 'cloud-data');
    if (!fs.existsSync(dir)) { try { fs.mkdirSync(dir); } catch(e){} }
}
function isHR(req){
    const role = req.headers['x-role'] || req.headers['x-user-role'];
    return ['hr_manager','hr_admin','admin'].includes(String(role||'').toLowerCase());
}
