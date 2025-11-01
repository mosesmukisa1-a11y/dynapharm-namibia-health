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
    if (!global.branches) {
        global.branches = [
            {
                id: 1,
                name: "Windhoek Main",
                address: "123 Independence Ave, Windhoek",
                phone: "+264 61 123 4567",
                manager: "John Doe",
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                name: "Swakopmund",
                address: "456 Main St, Swakopmund",
                phone: "+264 64 123 4567",
                manager: "Jane Smith",
                created_at: new Date().toISOString()
            }
        ];
    }
    
    if (req.method === 'GET') {
        res.status(200).json(global.branches);
    } else if (req.method === 'POST') {
        const newBranch = {
            id: global.branches.length + 1,
            ...req.body,
            created_at: new Date().toISOString()
        };
        global.branches.push(newBranch);
        res.status(201).json(newBranch);
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        const branchIndex = global.branches.findIndex(b => b.id === parseInt(id));
        if (branchIndex !== -1) {
            global.branches.splice(branchIndex, 1);
            res.status(200).json({ message: 'Branch deleted' });
        } else {
            res.status(404).json({ error: 'Branch not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
