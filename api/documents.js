import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    if (!global.documents || global.documents.length === 0) {
        try {
            const fp = filePath();
            global.documents = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp,'utf8')) : [];
        } catch(e){ global.documents = []; }
    }

    if (req.method === 'GET') {
        res.status(200).json(global.documents);
    } else if (req.method === 'POST') {
        const body = req.body || {};
        const rec = { id:`DOC-${Date.now()}`, title: body.title, userId: body.userId || null, category: body.category || 'policy', url: body.url || '', createdAt:new Date().toISOString() };
        global.documents.push(rec); save();
        res.status(201).json(rec);
    } else if (req.method === 'DELETE') {
        const { id } = req.query; if(!id){ res.status(400).json({ error:'Missing id' }); return; }
        const idx = global.documents.findIndex(d => d.id === id);
        if (idx === -1) { res.status(404).json({ error: 'Document not found' }); return; }
        const removed = global.documents.splice(idx,1)[0]; save();
        res.status(200).json({ success:true, deleted: removed.id });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function filePath(){ return path.join(process.cwd(), 'cloud-data', 'documents_data.json'); }
function save(){ try { fs.writeFileSync(filePath(), JSON.stringify(global.documents, null, 2)); } catch(e){} }


