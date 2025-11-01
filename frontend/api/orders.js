export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // In-memory store for orders (stateless across lambdas, but fine for demo)
    if (!global.orders) {
        global.orders = [];
    }

    try {
        if (req.method === 'GET') {
            const { id } = req.query || {};
            if (id) {
                const found = global.orders.find(o => String(o.id) === String(id));
                if (found) return res.status(200).json(found);
                return res.status(404).json({ error: 'Order not found' });
            }
            return res.status(200).json(global.orders);
        }

        if (req.method === 'POST') {
            const payload = req.body || {};
            const incomingId = (payload.id || '').toString().trim();

            if (incomingId) {
                const existing = global.orders.find(o => String(o.id) === incomingId);
                if (existing) {
                    return res.status(200).json({ success: true, message: 'Order already exists', order: existing });
                }
            }

            const id = incomingId || `ORD${Date.now()}`;
            const order = {
                id,
                date: payload.date || new Date().toISOString(),
                status: payload.status || 'pending',
                ...payload
            };
            global.orders.push(order);
            return res.status(201).json({ success: true, message: 'Order saved', order });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}


