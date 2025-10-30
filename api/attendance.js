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
            const attendanceFilePath = path.join(process.cwd(), 'cloud-data', 'attendance_data.json');
            if (fs.existsSync(attendanceFilePath)) {
                const fileData = fs.readFileSync(attendanceFilePath, 'utf8');
                global.attendance = JSON.parse(fileData);
                console.log(`✅ Loaded ${global.attendance.length} attendance records`);
            } else {
                // Generate sample data
                global.attendance = generateSampleAttendanceData();
                console.log('⚠️ No attendance file found, using sample data');
            }
        } catch (error) {
            console.error('❌ Error loading attendance:', error);
            global.attendance = generateSampleAttendanceData();
        }
    }
    
    if (req.method === 'GET') {
        const { branch, userId, date, startDate, endDate } = req.query;
        let filtered = [...global.attendance];
        
        if (branch) {
            filtered = filtered.filter(a => a.branch === branch);
        }
        if (userId) {
            filtered = filtered.filter(a => a.userId === userId);
        }
        if (date) {
            filtered = filtered.filter(a => a.date === date);
        }
        if (startDate && endDate) {
            filtered = filtered.filter(a => a.date >= startDate && a.date <= endDate);
        }
        
        res.status(200).json(filtered);
    } else if (req.method === 'POST') {
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
        const fp = path.join(process.cwd(),'cloud-data','hr_audit.json');
        const list = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp,'utf8')) : [];
        list.push({ id:`AUD-${Date.now()}`, event, details, at:new Date().toISOString() });
        fs.writeFileSync(fp, JSON.stringify(list, null, 2));
    } catch(e){}
}
