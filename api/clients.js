/**
 * Clients API Endpoint - PostgreSQL-based with Real-Time Sync
 * Primary storage: PostgreSQL Database
 * Real-time updates: WebSocket broadcasting
 */

import { findById, findAll, insert, update, remove, publishRealtimeEvent } from './db.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // GET - Fetch clients
        if (req.method === 'GET') {
            const { id, branch } = req.query || {};
            
            if (id) {
                // Get single client by ID or reference_number
                let client = await findById('clients', id);
                if (!client) {
                    // Try by reference_number
                    const clients = await findAll('clients', { reference_number: id });
                    if (clients.length > 0) {
                        return res.status(200).json(clients[0]);
                    }
                    return res.status(404).json({ error: 'Client not found' });
                }
                return res.status(200).json(client);
            }

            // Get all clients with optional branch filter
            const filters = branch ? { branch } : {};
            const clients = await findAll('clients', filters, 'full_name ASC');
            return res.status(200).json(clients);
        }

        // POST - Create new client
        if (req.method === 'POST') {
            const body = req.body || {};
            
            // Generate ID if not provided
            const clientId = body.id || body.reference_number || `CLI${Date.now()}`;
            
            // Check if client already exists (by reference_number or id)
            if (body.reference_number) {
                const existing = await findAll('clients', { reference_number: body.reference_number });
                if (existing.length > 0) {
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Client already exists',
                        client: existing[0]
                    });
                }
            }

            const clientData = {
                id: clientId,
                reference_number: body.reference_number || body.id || `REF${Date.now()}`,
                full_name: body.fullName || body.full_name || '',
                email: body.email || '',
                phone: body.phone || '',
                nb_number: body.nbNumber || body.nb_number || '',
                branch: body.branch || null,
                first_visit: body.firstVisit || body.first_visit || null,
            };

            const newClient = await insert('clients', clientData);
            
            if (!newClient) {
                return res.status(500).json({ error: 'Failed to create client' });
            }

            // Publish realtime event
            await publishRealtimeEvent('clients', 'created', newClient);

            return res.status(201).json({ 
                success: true, 
                message: 'Client created',
                client: newClient
            });
        }

        // PUT - Update client
        if (req.method === 'PUT') {
            const body = req.body || {};
            const clientId = body.id || body.reference_number;
            
            if (!clientId) {
                return res.status(400).json({ error: 'Client ID or reference_number required' });
            }

            // Find client by ID or reference_number
            let client = await findById('clients', clientId);
            if (!client && body.reference_number) {
                const clients = await findAll('clients', { reference_number: clientId });
                if (clients.length > 0) client = clients[0];
            }

            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }

            // Prepare update data
            const updateData = {};
            if (body.fullName !== undefined) updateData.full_name = body.fullName;
            if (body.full_name !== undefined) updateData.full_name = body.full_name;
            if (body.email !== undefined) updateData.email = body.email;
            if (body.phone !== undefined) updateData.phone = body.phone;
            if (body.nbNumber !== undefined) updateData.nb_number = body.nbNumber;
            if (body.nb_number !== undefined) updateData.nb_number = body.nb_number;
            if (body.branch !== undefined) updateData.branch = body.branch;
            if (body.firstVisit !== undefined) updateData.first_visit = body.firstVisit;
            if (body.first_visit !== undefined) updateData.first_visit = body.first_visit;

            // Check version for optimistic locking
            if (body.version !== undefined && client.version !== body.version) {
                return res.status(409).json({ 
                    error: 'Conflict: Client was modified by another user',
                    client: client,
                    yourVersion: body.version,
                    serverVersion: client.version
                });
            }

            const updatedClient = await update('clients', client.id, updateData);
            
            if (!updatedClient) {
                return res.status(500).json({ error: 'Failed to update client' });
            }

            // Publish realtime event
            await publishRealtimeEvent('clients', 'updated', updatedClient);

            return res.status(200).json({ 
                success: true, 
                message: 'Client updated',
                client: updatedClient
            });
        }

        // DELETE - Delete client
        if (req.method === 'DELETE') {
            const { id } = req.query || {};
            
            if (!id) {
                return res.status(400).json({ error: 'Client ID required' });
            }

            const deleted = await remove('clients', id);
            
            if (!deleted) {
                return res.status(404).json({ error: 'Client not found' });
            }

            // Publish realtime event
            await publishRealtimeEvent('clients', 'deleted', { id });

            return res.status(200).json({ 
                success: true, 
                message: 'Client deleted'
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
