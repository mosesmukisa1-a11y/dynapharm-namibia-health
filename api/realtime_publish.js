export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        res.status(501).json({ error: 'Realtime not configured' });
        return;
    }

    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { channel = 'reports', event = {} } = req.body || {};
        const endpoint = `${url.replace(/\/$/, '')}/publish/${encodeURIComponent(channel)}`;
        const payload = typeof event === 'string' ? event : JSON.stringify(event);
        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: payload })
        });
        const text = await upstream.text();
        if (!upstream.ok) throw new Error(text);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Publish failed' });
    }
}


