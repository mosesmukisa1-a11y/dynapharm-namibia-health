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
    
    // Load reports from file if not already loaded
    if (!global.reports || global.reports.length === 0) {
        try {
            const reportsFilePath = path.join(process.cwd(), 'reports_data.json');
            if (fs.existsSync(reportsFilePath)) {
                const fileData = fs.readFileSync(reportsFilePath, 'utf8');
                global.reports = JSON.parse(fileData);
                console.log(`✅ Loaded ${global.reports.length} reports from file`);
            } else {
                // Fallback to empty array if file doesn't exist
                global.reports = [];
                console.log('⚠️ reports_data.json not found, starting with empty array');
            }
        } catch (error) {
            console.error('❌ Error loading reports:', error);
            global.reports = [];
        }
    }
    
    if (req.method === 'GET') {
        res.status(200).json(global.reports);
    } else if (req.method === 'POST') {
        const newReport = {
            id: global.reports.length + 1,
            ...req.body,
            created_at: new Date().toISOString()
        };
        global.reports.push(newReport);
        res.status(201).json(newReport);
    } else if (req.method === 'PUT') {
        const { id, ...updateData } = req.body;
        const reportIndex = global.reports.findIndex(r => r.id === parseInt(id));
        if (reportIndex !== -1) {
            global.reports[reportIndex] = { ...global.reports[reportIndex], ...updateData };
            res.status(200).json(global.reports[reportIndex]);
        } else {
            res.status(404).json({ error: 'Report not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
