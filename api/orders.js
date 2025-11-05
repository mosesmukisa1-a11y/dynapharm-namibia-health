/**
 * Orders API Endpoint - PostgreSQL-based with Real-Time Sync
 * Primary storage: PostgreSQL Database
 * Real-time updates: WebSocket broadcasting
 */

import { findById, findAll, insert, update, remove, publishRealtimeEvent } from './db.js';

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
        // GET - Fetch orders
        if (req.method === 'GET') {
            const { id, branch, status, client_id } = req.query || {};
            
            if (id) {
                const order = await findById('orders', id);
                if (!order) {
                    return res.status(404).json({ error: 'Order not found' });
                }
                
                // Parse JSONB items if present
                if (order.items && typeof order.items === 'string') {
                    try {
                        order.items = JSON.parse(order.items);
                    } catch (e) {
                        order.items = [];
                    }
                }
                
                return res.status(200).json(order);
            }

            // Get all orders with optional filters
            const filters = {};
            if (branch) filters.branch = branch;
            if (status) filters.status = status;
            if (client_id) filters.client_id = client_id;

            const orders = await findAll('orders', filters, 'date DESC');
            
            // Parse JSONB items for all orders
            orders.forEach(order => {
                if (order.items && typeof order.items === 'string') {
                    try {
                        order.items = JSON.parse(order.items);
                    } catch (e) {
                        order.items = [];
                    }
                }
            });

            return res.status(200).json(orders);
        }

        // POST - Create new order
        if (req.method === 'POST') {
            const payload = req.body || {};
            const incomingId = (payload.id || '').toString().trim();

            // Check for existing order (idempotency)
            if (incomingId) {
                const existing = await findById('orders', incomingId);
                if (existing) {
                    // Parse JSONB items
                    if (existing.items && typeof existing.items === 'string') {
                        try {
                            existing.items = JSON.parse(existing.items);
                        } catch (e) {
                            existing.items = [];
                        }
                    }
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Order already exists', 
                        order: existing 
                    });
                }
            }

            const orderId = incomingId || `ORD${Date.now()}`;
            
            // Prepare order data for database
            const orderData = {
                id: orderId,
                client_id: payload.client_id || payload.clientId || null,
                branch: payload.branch || null,
                status: payload.status || 'pending',
                payment_status: payload.payment_status || payload.paymentStatus || 'pending',
                payment_provider: payload.payment_provider || payload.paymentProvider || null,
                transaction_id: payload.transaction_id || payload.transactionId || null,
                total_amount: payload.total_amount || payload.totalAmount || 0,
                items: payload.items ? JSON.stringify(payload.items) : JSON.stringify([]),
                date: payload.date || new Date().toISOString(),
                created_by: payload.created_by || payload.createdBy || null,
            };

            const newOrder = await insert('orders', orderData);
            
            if (!newOrder) {
                return res.status(500).json({ error: 'Failed to create order' });
            }

            // Parse JSONB items for response
            if (newOrder.items && typeof newOrder.items === 'string') {
                try {
                    newOrder.items = JSON.parse(newOrder.items);
                } catch (e) {
                    newOrder.items = [];
                }
            }

            // Publish realtime event
            await publishRealtimeEvent('orders', 'created', newOrder);

            return res.status(201).json({ 
                success: true, 
                message: 'Order created', 
                order: newOrder
            });
        }

        // PUT - Update order
        if (req.method === 'PUT') {
            const payload = req.body || {};
            const orderId = payload.id;

            if (!orderId) {
                return res.status(400).json({ error: 'Order ID required' });
            }

            const existing = await findById('orders', orderId);
            if (!existing) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Check version for optimistic locking
            if (payload.version !== undefined && existing.version !== payload.version) {
                return res.status(409).json({ 
                    error: 'Conflict: Order was modified by another user',
                    order: existing,
                    yourVersion: payload.version,
                    serverVersion: existing.version
                });
            }

            // Prepare update data
            const updateData = {};
            if (payload.status !== undefined) updateData.status = payload.status;
            if (payload.payment_status !== undefined) updateData.payment_status = payload.payment_status;
            if (payload.paymentStatus !== undefined) updateData.payment_status = payload.paymentStatus;
            if (payload.payment_provider !== undefined) updateData.payment_provider = payload.payment_provider;
            if (payload.paymentProvider !== undefined) updateData.payment_provider = payload.paymentProvider;
            if (payload.transaction_id !== undefined) updateData.transaction_id = payload.transaction_id;
            if (payload.transactionId !== undefined) updateData.transaction_id = payload.transactionId;
            if (payload.total_amount !== undefined) updateData.total_amount = payload.total_amount;
            if (payload.totalAmount !== undefined) updateData.total_amount = payload.totalAmount;
            if (payload.items !== undefined) updateData.items = JSON.stringify(payload.items);

            const updatedOrder = await update('orders', orderId, updateData);
            
            if (!updatedOrder) {
                return res.status(500).json({ error: 'Failed to update order' });
            }

            // Parse JSONB items for response
            if (updatedOrder.items && typeof updatedOrder.items === 'string') {
                try {
                    updatedOrder.items = JSON.parse(updatedOrder.items);
                } catch (e) {
                    updatedOrder.items = [];
                }
            }

            // Publish realtime event
            await publishRealtimeEvent('orders', 'updated', updatedOrder);

            return res.status(200).json({ 
                success: true, 
                message: 'Order updated', 
                order: updatedOrder
            });
        }

        // DELETE - Delete order
        if (req.method === 'DELETE') {
            const { id } = req.query || {};
            
            if (!id) {
                return res.status(400).json({ error: 'Order ID required' });
            }

            const deleted = await remove('orders', id);
            
            if (!deleted) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Publish realtime event
            await publishRealtimeEvent('orders', 'deleted', { id });

            return res.status(200).json({ 
                success: true, 
                message: 'Order deleted'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Orders API error:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}


