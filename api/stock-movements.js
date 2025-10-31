export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-github-token');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const ownerRepo = 'mosesmukisa1-a11y/dynapharm-namibia-health';
        const contentPath = 'cloud-data/stock_movements.json';
        const apiBase = 'https://api.github.com';

        async function fetchRawList() {
            try {
                const raw = await fetch(`https://raw.githubusercontent.com/${ownerRepo}/main/${contentPath}`);
                if (raw.ok) { return await raw.json(); }
            } catch(_) {}
            return [];
        }

        async function getExisting(token) {
            const url = `${apiBase}/repos/${ownerRepo}/contents/${contentPath}`;
            const resp = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (resp.status === 404) return { sha: null, data: [] };
            if (!resp.ok) throw new Error(`GitHub read failed: ${resp.status}`);
            const json = await resp.json();
            const content = Buffer.from(json.content || '', 'base64').toString('utf8');
            let data = [];
            try { data = JSON.parse(content) || []; } catch(_) { data = []; }
            return { sha: json.sha || null, data };
        }

        if (req.method === 'GET') {
            const list = await fetchRawList();
            return res.status(200).json(Array.isArray(list) ? list : []);
        }

        if (req.method === 'POST') {
            const headerToken = req.headers['x-github-token'] || req.body?.token;
            const serverToken = process.env.GITHUB_TOKEN || '';
            const token = headerToken || serverToken;
            if (!token) return res.status(400).json({ error: 'Missing GitHub token' });

            const payload = req.body?.movement;
            if (!payload || typeof payload !== 'object') {
                return res.status(400).json({ error: 'Missing movement object' });
            }

            // Normalize movement
            const movement = {
                id: payload.id || `MOV-${Date.now()}`,
                type: payload.type, // receive|transfer|adjust|dispense
                product: payload.product,
                batchNo: payload.batchNo || null,
                quantity: Number(payload.quantity || 0),
                source: payload.source || null,
                destination: payload.destination || null,
                branchId: payload.branchId || null,
                reference: payload.reference || null,
                createdBy: payload.createdBy || 'system',
                createdAt: payload.createdAt || new Date().toISOString(),
                meta: payload.meta || {}
            };

            if (!movement.type || !movement.product || !movement.quantity) {
                return res.status(400).json({ error: 'Invalid movement' });
            }

            const { sha, data } = await getExisting(token);
            const list = Array.isArray(data) ? data : [];
            list.push(movement);

            const body = {
                message: `Stock movement ${movement.id}`,
                content: Buffer.from(JSON.stringify(list, null, 2), 'utf8').toString('base64'),
                sha: sha || undefined
            };
            const putUrl = `${apiBase}/repos/${ownerRepo}/contents/${contentPath}`;
            const putResp = await fetch(putUrl, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!putResp.ok) {
                const txt = await putResp.text();
                throw new Error(`GitHub write failed: ${putResp.status} ${txt}`);
            }

            return res.status(200).json({ success: true, movement });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Internal Error' });
    }
}


