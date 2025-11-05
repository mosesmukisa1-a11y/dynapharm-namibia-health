import { findAll, findById, insert, update, remove, publishRealtimeEvent } from './db.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET - List all clients or get one by ID
    if (req.method === 'GET') {
      const { id, branch } = req.query || {};
      
      if (id) {
        // Get single client
        const client = await findById('clients', id);
        if (!client) {
          return res.status(404).json({ error: 'Client not found' });
        }
        return res.status(200).json(client);
      }
      
      // Get all clients (optionally filtered by branch)
      const conditions = branch ? { branch } : {};
      const clients = await findAll('clients', conditions, 'created_at DESC');
      return res.status(200).json(clients);
    }

    // POST - Create new client
    if (req.method === 'POST') {
      const body = req.body || {};
      
      // Generate ID if not provided
      if (!body.id) {
        body.id = body.reference_number || `CLT-${Date.now()}`;
      }
      
      // Ensure required fields
      if (!body.full_name) {
        return res.status(400).json({ error: 'full_name is required' });
      }
      
      // Set timestamps
      body.created_at = new Date().toISOString();
      body.updated_at = new Date().toISOString();
      
      // Insert into database
      const newClient = await insert('clients', body);
      
      // Publish realtime event (non-blocking)
      await publishRealtimeEvent('clients', 'created', newClient);
      
      return res.status(201).json({ 
        success: true, 
        client: newClient,
        message: 'Client created successfully'
      });
    }

    // PUT - Update client
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body || {};
      
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const updatedClient = await update('clients', id, updateData);
      
      if (!updatedClient) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Publish realtime event
      await publishRealtimeEvent('clients', 'updated', updatedClient);
      
      return res.status(200).json({ 
        success: true, 
        client: updatedClient 
      });
    }

    // DELETE - Delete client
    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      
      const deletedClient = await remove('clients', id);
      
      if (!deletedClient) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Publish realtime event
      await publishRealtimeEvent('clients', 'deleted', { id });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Client deleted',
        client: deletedClient
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
