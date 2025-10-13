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
    if (!global.users) {
        global.users = [
            {
                id: 1,
                name: "Admin User",
                email: "admin@dynapharm.com",
                role: "admin",
                branch: "Windhoek",
                created_at: new Date().toISOString()
            }
        ];
    }
    
    if (req.method === 'GET') {
        res.status(200).json(global.users);
    } else if (req.method === 'POST') {
        const newUser = {
            id: global.users.length + 1,
            ...req.body,
            created_at: new Date().toISOString()
        };
        global.users.push(newUser);
        res.status(201).json(newUser);
    } else if (req.method === 'PUT') {
        const { id, ...updateData } = req.body;
        const userIndex = global.users.findIndex(u => u.id === parseInt(id));
        if (userIndex !== -1) {
            global.users[userIndex] = { ...global.users[userIndex], ...updateData };
            res.status(200).json(global.users[userIndex]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        const userIndex = global.users.findIndex(u => u.id === parseInt(id));
        if (userIndex !== -1) {
            global.users.splice(userIndex, 1);
            res.status(200).json({ message: 'User deleted' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
