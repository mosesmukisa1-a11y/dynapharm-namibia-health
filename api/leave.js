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
        const newLeave = {
            id: `LEAVE-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString()
        };
        global.leaveRequests.push(newLeave);
        saveLeaveToFile();
        res.status(201).json(newLeave);
    } else if (req.method === 'PUT') {
        const { id, ...updateData } = req.body;
        const index = global.leaveRequests.findIndex(l => l.id === id);
        if (index !== -1) {
            global.leaveRequests[index] = { ...global.leaveRequests[index], ...updateData };
            saveLeaveToFile();
            res.status(200).json(global.leaveRequests[index]);
        } else {
            res.status(404).json({ error: 'Leave request not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function saveLeaveToFile() {
    try {
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
