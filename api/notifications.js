import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    if (!global.notifications || global.notifications.length === 0) {
        try {
            const fp = filePath();
            global.notifications = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp,'utf8')) : [];
        } catch(e){ global.notifications = []; }
    }

    if (req.method === 'GET') {
        const { unread } = req.query;
        const list = unread ? global.notifications.filter(n => !n.read) : global.notifications;
        res.status(200).json(list);
    } else if (req.method === 'POST') {
        const body = req.body || {};
        const rec = { id:`NTF-${Date.now()}`, type: body.type||'info', title: body.title||'', message: body.message||'', refId: body.refId||null, createdAt:new Date().toISOString(), read:false };
        global.notifications.push(rec); save();
        res.status(201).json(rec);
    } else if (req.method === 'PUT') {
        const { id, read } = req.body || {};
        const idx = global.notifications.findIndex(n=>n.id===id); if(idx===-1){ res.status(404).json({ error:'Not found' }); return; }
        global.notifications[idx].read = !!read; save();
        res.status(200).json(global.notifications[idx]);
    } else if (req.method === 'DELETE') {
        const { id } = req.query; if(!id){ res.status(400).json({ error:'Missing id' }); return; }
        const idx = global.notifications.findIndex(n=>n.id===id); if(idx===-1){ res.status(404).json({ error:'Not found' }); return; }
        const removed = global.notifications.splice(idx,1)[0]; save();
        res.status(200).json({ success:true, deleted: removed.id });
    } else {
        res.status(405).json({ error:'Method not allowed' });
    }
}

function filePath(){ return path.join(process.cwd(),'cloud-data','notifications_data.json'); }
function save(){ try { fs.writeFileSync(filePath(), JSON.stringify(global.notifications, null, 2)); } catch(e){} }


