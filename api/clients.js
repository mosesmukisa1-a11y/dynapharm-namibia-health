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
    if (!global.clients) {
        global.clients = [
            {
                id: 1,
                name: "Sample Client",
                email: "client@example.com",
                phone: "+264 81 123 4567",
                address: "Windhoek, Namibia",
                created_at: new Date().toISOString()
            }
        ];
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
