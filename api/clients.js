import fs from 'fs';
import path from 'path';

// Minimal Upstash Redis REST helper (optional if env is set)
async function redisGet(key) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    try {
        const resp = await fetch(`${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        // Upstash returns { result: string|null }
        return json.result ? JSON.parse(json.result) : null;
    } catch (_) { return null; }
}

async function redisSet(key, value) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return false;
    try {
        const resp = await fetch(`${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.stringify(value) })
        });
        return resp.ok;
    } catch (_) { return false; }
}

async function loadClients() {
    // Prefer Redis if configured
    const fromRedis = await redisGet('clients');
    if (Array.isArray(fromRedis)) return fromRedis;
    // Fallback: derive from reports file (bootstraps initial clients)
    try {
        const reportsFilePath = path.join(process.cwd(), 'reports_data.json');
        if (fs.existsSync(reportsFilePath)) {
            const reportsData = JSON.parse(fs.readFileSync(reportsFilePath, 'utf8'));
            const clientsMap = new Map();
            for (const report of reportsData) {
                if (report && report.clientInfo && report.clientId) {
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
            }
            const clients = Array.from(clientsMap.values());
            // Best-effort persist to Redis if available
            try { await redisSet('clients', clients); } catch(_) {}
            return clients;
        }
    } catch (e) {
        // ignore and fall through
    }
    return [];
}

async function saveClientAndReturnAll(newClient) {
    // Try Redis first
    try {
        const current = (await redisGet('clients')) || [];
        current.push(newClient);
        await redisSet('clients', current);
        return current;
    } catch (_) {}
    // Fallback to in-memory (ephemeral on serverless)
    if (!global.clients) global.clients = await loadClients();
    global.clients.push(newClient);
    return global.clients;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            const clients = global.clients && Array.isArray(global.clients)
                ? global.clients
                : await loadClients();
            global.clients = clients;
            res.status(200).json(clients);
            return;
        }
        if (req.method === 'POST') {
            const body = req.body || {};
            const newClient = {
                // Prefer stable referenceNumber if provided by FE, fallback to timestamp id
                id: body.referenceNumber || `CLT-${Date.now()}`,
                ...body,
                created_at: new Date().toISOString()
            };
            const all = await saveClientAndReturnAll(newClient);

            // Best-effort: publish realtime event so portals refresh
            try {
                await fetch('/api/realtime_publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channel: 'clients', event: { type: 'clients:updated', referenceNumber: newClient.id, action: 'created', ts: Date.now() } })
                });
            } catch (_) {}

            res.status(201).json({ success: true, client: newClient, total: all.length });
            return;
        }
        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Internal error' });
    }
}
