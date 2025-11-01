import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Realtime gateway listening on', server.address().port);
});

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      try { client.send(msg); } catch (_) {}
    }
  });
}

wss.on('connection', (ws) => {
  try { ws.send(JSON.stringify({ type: 'hello', ts: Date.now() })); } catch(_) {}
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/publish', (req, res) => {
  try {
    const { event = {} } = req.body || {};
    broadcast({ type: 'event', ...event });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'publish failed' });
  }
});


