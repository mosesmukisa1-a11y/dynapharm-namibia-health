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
    
    // Load clients from reports file
    if (!global.clients || global.clients.length === 0) {
        try {
            const reportsFilePath = path.join(process.cwd(), 'reports_data.json');
            if (fs.existsSync(reportsFilePath)) {
                const reportsData = JSON.parse(fs.readFileSync(reportsFilePath, 'utf8'));
                
                // Extract unique clients from reports
                const clientsMap = new Map();
                reportsData.forEach(report => {
                    if (report.clientInfo && report.clientId) {
                        if (!clientsMap.has(report.clientId)) {
                            clientsMap.set(report.clientId, {
                                id: report.clientId,
                                fullName: report.clientInfo.fullName,
                                email: report.clientInfo.email || '',
                                phone: report.clientInfo.phone,
                                nbNumber: report.clientInfo.nbNumber || '',
                                firstVisit: report.timestamp
                            });
                        }
                    }
                });
                
                global.clients = Array.from(clientsMap.values());
                console.log(`✅ Loaded ${global.clients.length} unique clients from reports`);
            } else {
                global.clients = [];
            }
        } catch (error) {
            console.error('❌ Error loading clients:', error);
            global.clients = [];
        }
    }
    
    if (req.method === 'GET') {
        res.status(200).json(global.clients);
    } else if (req.method === 'POST') {
        const newClient = {
            id: global.clients.length + 1,
            ...req.body,
            created_at: new Date().toISOString()
        };
        global.clients.push(newClient);
        res.status(201).json(newClient);
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
