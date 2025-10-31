export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { token, snapshot, meta } = req.body || {};
        if (!token) {
            return res.status(400).json({ error: 'Missing GitHub token' });
        }
        if (!snapshot || typeof snapshot !== 'object') {
            return res.status(400).json({ error: 'Missing snapshot' });
        }

        const ownerRepo = 'mosesmukisa1-a11y/dynapharm-namibia-health';
        const path = 'cloud-data/collected_data.json';
        const apiBase = 'https://api.github.com';

        // Helper to GET current file SHA and contents
        async function getExisting() {
            const url = `${apiBase}/repos/${ownerRepo}/contents/${path}`;
            const resp = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${token}`
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

        const now = new Date().toISOString();
        const { sha, data } = await getExisting();
        const entry = {
            id: `SNAP-${Date.now()}`,
            receivedAt: now,
            meta: meta || {},
            snapshot
        };
        data.push(entry);

        const body = {
            message: `Collect snapshot ${entry.id}`,
            content: Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64'),
            sha: sha || undefined
        };

        const putUrl = `${apiBase}/repos/${ownerRepo}/contents/${path}`;
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

        res.status(200).json({ success: true, id: entry.id });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Internal Error' });
    }
}


