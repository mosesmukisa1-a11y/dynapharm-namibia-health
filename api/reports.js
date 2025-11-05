/**
 * Reports API Endpoint - PostgreSQL-based with Real-Time Sync
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
        // GET - Fetch reports
        if (req.method === 'GET') {
            const { id, branch, client_id, date_from, date_to } = req.query || {};
            
            if (id) {
                const report = await findById('reports', id);
                if (!report) {
                    return res.status(404).json({ error: 'Report not found' });
                }
                
                // Parse JSONB products if present
                if (report.products && typeof report.products === 'string') {
                    try {
                        report.products = JSON.parse(report.products);
                    } catch (e) {
                        report.products = [];
                    }
                }
                
                return res.status(200).json(report);
            }

            // Get all reports with optional filters
            const filters = {};
            if (branch) filters.branch = branch;
            if (client_id) filters.client_id = client_id;

            let reports = await findAll('reports', filters, 'date DESC');
            
            // Apply date filters if provided
            if (date_from || date_to) {
                reports = reports.filter(report => {
                    const reportDate = new Date(report.date);
                    if (date_from && reportDate < new Date(date_from)) return false;
                    if (date_to && reportDate > new Date(date_to)) return false;
                    return true;
                });
            }

            // Parse JSONB products for all reports
            reports.forEach(report => {
                if (report.products && typeof report.products === 'string') {
                    try {
                        report.products = JSON.parse(report.products);
                    } catch (e) {
                        report.products = [];
                    }
                }
            });

            return res.status(200).json(reports);
        }

        // POST - Create new report
        if (req.method === 'POST') {
            const body = req.body || {};
            
            // Generate ID if not provided
            const reportId = body.id || `RPT${Date.now()}`;
            
            // Prepare report data for database
            const reportData = {
                id: reportId,
                client_id: body.client_id || body.clientId || null,
                client_name: body.client_name || body.clientName || '',
                branch: body.branch || null,
                date: body.date || new Date().toISOString().split('T')[0],
                status: body.status || 'completed',
                total_amount: body.total_amount || body.totalAmount || 0,
                products: body.products ? JSON.stringify(body.products) : JSON.stringify([]),
                notes: body.notes || '',
                created_by: body.created_by || body.createdBy || null,
            };

            const newReport = await insert('reports', reportData);
            
            if (!newReport) {
                return res.status(500).json({ error: 'Failed to create report' });
            }

            // Parse JSONB products for response
            if (newReport.products && typeof newReport.products === 'string') {
                try {
                    newReport.products = JSON.parse(newReport.products);
                } catch (e) {
                    newReport.products = [];
                }
            }

            // Publish realtime event
            await publishRealtimeEvent('reports', 'created', newReport);

            return res.status(201).json({ 
                success: true, 
                message: 'Report created',
                report: newReport
            });
        }

        // PUT - Update report
        if (req.method === 'PUT') {
            const body = req.body || {};
            const reportId = body.id;

            if (!reportId) {
                return res.status(400).json({ error: 'Report ID required' });
            }

            const existing = await findById('reports', reportId);
            if (!existing) {
                return res.status(404).json({ error: 'Report not found' });
            }

            // Check version for optimistic locking
            if (body.version !== undefined && existing.version !== body.version) {
                return res.status(409).json({ 
                    error: 'Conflict: Report was modified by another user',
                    report: existing,
                    yourVersion: body.version,
                    serverVersion: existing.version
                });
            }

            // Prepare update data
            const updateData = {};
            if (body.client_name !== undefined) updateData.client_name = body.client_name;
            if (body.clientName !== undefined) updateData.client_name = body.clientName;
            if (body.status !== undefined) updateData.status = body.status;
            if (body.total_amount !== undefined) updateData.total_amount = body.total_amount;
            if (body.totalAmount !== undefined) updateData.total_amount = body.totalAmount;
            if (body.products !== undefined) updateData.products = JSON.stringify(body.products);
            if (body.notes !== undefined) updateData.notes = body.notes;
            if (body.date !== undefined) updateData.date = body.date;

            const updatedReport = await update('reports', reportId, updateData);
            
            if (!updatedReport) {
                return res.status(500).json({ error: 'Failed to update report' });
            }

            // Parse JSONB products for response
            if (updatedReport.products && typeof updatedReport.products === 'string') {
                try {
                    updatedReport.products = JSON.parse(updatedReport.products);
                } catch (e) {
                    updatedReport.products = [];
                }
            }

            // Publish realtime event
            await publishRealtimeEvent('reports', 'updated', updatedReport);

            return res.status(200).json({ 
                success: true, 
                message: 'Report updated',
                report: updatedReport
            });
        }

        // DELETE - Delete report
        if (req.method === 'DELETE') {
            const { id } = req.query || {};
            
            if (!id) {
                return res.status(400).json({ error: 'Report ID required' });
            }

            const deleted = await remove('reports', id);
            
            if (!deleted) {
                return res.status(404).json({ error: 'Report not found' });
            }

            // Publish realtime event
            await publishRealtimeEvent('reports', 'deleted', { id });

            return res.status(200).json({ 
                success: true, 
                message: 'Report deleted'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Reports API error:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
