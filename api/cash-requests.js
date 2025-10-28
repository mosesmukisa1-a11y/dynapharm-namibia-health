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
    
    if (!global.cashRequests || global.cashRequests.length === 0) {
        try {
            const cashFilePath = path.join(process.cwd(), 'cloud-data', 'cash_requests_data.json');
            if (fs.existsSync(cashFilePath)) {
                const fileData = fs.readFileSync(cashFilePath, 'utf8');
                global.cashRequests = JSON.parse(fileData);
                console.log(`✅ Loaded ${global.cashRequests.length} cash requests`);
            } else {
                global.cashRequests = generateSampleCashRequests();
                console.log('⚠️ No cash requests file found, using sample data');
            }
        } catch (error) {
            console.error('❌ Error loading cash requests:', error);
            global.cashRequests = generateSampleCashRequests();
        }
    }
    
    if (req.method === 'GET') {
        const { branch, status } = req.query;
        let filtered = [...global.cashRequests];
        
        if (branch) filtered = filtered.filter(c => c.branch === branch);
        if (status) filtered = filtered.filter(c => c.status === status);
        
        res.status(200).json(filtered);
    } else if (req.method === 'POST') {
        const newRequest = {
            id: `CASH-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString()
        };
        global.cashRequests.push(newRequest);
        saveCashToFile();
        res.status(201).json(newRequest);
    } else if (req.method === 'PUT') {
        const { id, ...updateData } = req.body;
        const index = global.cashRequests.findIndex(c => c.id === id);
        if (index !== -1) {
            global.cashRequests[index] = { ...global.cashRequests[index], ...updateData };
            saveCashToFile();
            res.status(200).json(global.cashRequests[index]);
        } else {
            res.status(404).json({ error: 'Cash request not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function saveCashToFile() {
    try {
        const cashFilePath = path.join(process.cwd(), 'cloud-data', 'cash_requests_data.json');
        fs.writeFileSync(cashFilePath, JSON.stringify(global.cashRequests, null, 2));
    } catch (error) {
        console.error('❌ Error saving cash requests:', error);
    }
}

function generateSampleCashRequests() {
    const now = Date.now();
    return [
        {
            id: 'CASH-001',
            branch: 'townshop',
            branchName: 'Townshop Branch',
            requestedBy: 'Jennifer Joseph',
            requestedById: 'STAFF-TOWNSHOP-1',
            amount: 5000,
            currency: 'NAD',
            purpose: 'Petty cash for daily operations',
            status: 'pending',
            priority: 'normal',
            requestedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'CASH-002',
            branch: 'swakopmund',
            branchName: 'Swakopmund Branch',
            requestedBy: 'Branch Manager',
            requestedById: 'STAFF-SWAKOPMUND-MGR',
            amount: 15000,
            currency: 'NAD',
            purpose: 'Equipment purchase',
            status: 'pending',
            priority: 'high',
            requestedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'CASH-003',
            branch: 'walvisbay',
            branchName: 'Walvis Bay Branch',
            requestedBy: 'Manager',
            requestedById: 'STAFF-WALVISBAY-MGR',
            amount: 8000,
            currency: 'NAD',
            purpose: 'Office supplies',
            status: 'approved',
            priority: 'normal',
            requestedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
            approvedBy: 'Finance Manager',
            approvedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
}
