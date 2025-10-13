export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Simple in-memory storage (in production, use a database)
    if (!global.reports) {
        global.reports = [
            {
                id: 1,
                title: "Monthly Sales Report",
                type: "sales",
                branch: "Windhoek Main",
                data: {
                    total_sales: 150000,
                    new_clients: 25,
                    revenue: 75000
                },
                created_at: new Date().toISOString()
            }
        ];
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
