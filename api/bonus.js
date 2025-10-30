import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Bonus data file
const BONUS_FILE = path.join(process.cwd(), 'bonus_data.json');

// Load bonus data from file
function loadBonusData() {
    try {
        if (fs.existsSync(BONUS_FILE)) {
            const fileData = fs.readFileSync(BONUS_FILE, 'utf8');
            return JSON.parse(fileData);
        }
    } catch (error) {
        console.error('Error loading bonus data:', error);
    }
    return {
        monthlyUploads: [],
        payments: [],
        approvals: [],
        auditLogs: [],
        config: {
            secondApproverThreshold: 5000,
            varianceTolerance: 0.5,
            notifications: { slackWebhookUrl: null, emailEnabled: false }
        },
        history: {}
    };
}

// Save bonus data to file
function saveBonusData(data) {
    try {
        fs.writeFileSync(BONUS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving bonus data:', error);
        return false;
    }
}

// Get month key (YYYY-MM format)
function getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    let bonusData = loadBonusData();

    // Simple RBAC via headers (fallback if no auth middleware)
    const userRole = (req.headers['x-user-role'] || '').toString();
    const userName = (req.headers['x-user-name'] || 'system').toString();
    const userIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString();

    function requireRole(allowedRoles = []) {
        if (allowedRoles.length === 0) return true;
        if (!userRole) return false;
        return allowedRoles.includes(userRole);
    }

    function logAudit(event) {
        const entry = {
            id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            at: new Date().toISOString(),
            user: userName,
            role: userRole || null,
            ip: userIp || null,
            ...event
        };
        if (!bonusData.auditLogs) bonusData.auditLogs = [];
        bonusData.auditLogs.push(entry);
        saveBonusData(bonusData);
        return entry;
    }
    async function notify(event) {
        try {
            const cfg = bonusData.config || {};
            logAudit({ type: 'notify', channel: 'system', payload: event });
        } catch(_) {}
    }
    
    if (req.method === 'GET') {
        const { action, month, distributor, drn } = req.query;
        
        if (action === 'config') {
            return res.status(200).json(bonusData.config || {});
        }
        
        // Get all monthly uploads
        if (action === 'uploads') {
            return res.status(200).json(bonusData.monthlyUploads || []);
        }
        
        // Get specific month upload
        if (action === 'month' && month) {
            const upload = bonusData.monthlyUploads?.find(u => u.month === month);
            return res.status(200).json(upload || null);
        }
        
        // Get distributor history
        if (action === 'history' && (distributor || drn)) {
            const identifier = distributor || drn;
            const history = [];
            
            bonusData.monthlyUploads?.forEach(upload => {
                const item = upload.items?.find(i => 
                    i.drn === identifier || i.name?.toLowerCase().includes(identifier.toLowerCase())
                );
                if (item) {
                    const payment = bonusData.payments?.find(p => 
                        p.drn === item.drn && p.month === upload.month
                    );
                    history.push({
                        month: upload.month,
                        drn: item.drn,
                        name: item.name,
                        stockist: item.stockist,
                        area: item.area,
                        amount: item.amount,
                        signature: item.signature,
                        paymentMethod: payment?.method || null,
                        paymentStatus: payment?.status || 'unpaid',
                        paidAt: payment?.paidAt || null,
                        paidBy: payment?.paidBy || null,
                        paymentNotes: payment?.notes || null
                    });
                }
            });
            
            return res.status(200).json(history);
        }
        
        // Get payments
        if (action === 'payments') {
            const payments = bonusData.payments || [];
            if (month) {
                return res.status(200).json(payments.filter(p => p.month === month));
            }
            return res.status(200).json(payments);
        }
        
        // Get monthly statement
        if (action === 'statement' && month) {
            const upload = bonusData.monthlyUploads?.find(u => u.month === month);
            if (!upload) {
                return res.status(404).json({ error: 'No bonus upload found for this month' });
            }
            
            const payments = bonusData.payments?.filter(p => p.month === month) || [];
            const uploadedDns = new Set(upload.items?.map(i => i.drn) || []);
            const paidDns = new Set(payments.filter(p => p.status === 'paid').map(p => p.drn));
            
            const statement = {
                month: upload.month,
                uploadedAt: upload.createdAt,
                totalRecords: upload.items?.length || 0,
                totalAmount: upload.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
                paidRecords: paidDns.size,
                paidAmount: payments
                    .filter(p => p.status === 'paid')
                    .reduce((sum, p) => sum + (p.amount || 0), 0),
                unpaidRecords: uploadedDns.size - paidDns.size,
                unpaidAmount: upload.items
                    .filter(i => !paidDns.has(i.drn))
                    .reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
                paymentBreakdown: {
                    cash: payments.filter(p => p.method === 'cash' && p.status === 'paid').length,
                    cashAmount: payments
                        .filter(p => p.method === 'cash' && p.status === 'paid')
                        .reduce((sum, p) => sum + (p.amount || 0), 0),
                    bank: payments.filter(p => p.method === 'bank' && p.status === 'paid').length,
                    bankAmount: payments
                        .filter(p => p.method === 'bank' && p.status === 'paid')
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                },
                items: upload.items?.map(item => {
                    const payment = payments.find(p => p.drn === item.drn);
                    return {
                        ...item,
                        paymentMethod: payment?.method || null,
                        paymentStatus: payment?.status || 'unpaid',
                        paidAt: payment?.paidAt || null,
                        paidBy: payment?.paidBy || null
                    };
                }) || []
            };
            
            return res.status(200).json(statement);
        }

        // Reconciliation variances (uploaded vs paid)
        if (action === 'variances' && month) {
            const upload = bonusData.monthlyUploads?.find(u => u.month === month);
            if (!upload) return res.status(404).json({ error: 'No bonus upload found for this month' });
            const payments = bonusData.payments?.filter(p => p.month === month) || [];
            const drnToUpload = new Map(upload.items.map(i => [i.drn, i]));
            const drnToPayment = new Map(payments.map(p => [p.drn, p]));
            const items = [];
            drnToUpload.forEach((u, drn) => {
                const p = drnToPayment.get(drn);
                const variance = (p?.amount || 0) - (u?.amount || 0);
                items.push({
                    drn,
                    name: u.name,
                    uploadedAmount: u.amount,
                    paidAmount: p?.amount || 0,
                    method: p?.method || null,
                    status: p?.status || 'unpaid',
                    variance
                });
            });
            const duplicates = payments
                .reduce((acc, p) => {
                    const key = `${p.month}:${p.drn}`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
            const duplicateKeys = Object.keys(duplicates).filter(k => duplicates[k] > 1);
            return res.status(200).json({ items, duplicateKeys });
        }

        // Export batches
        if (action === 'export-bank-csv' && month) {
            const payments = (bonusData.payments || []).filter(p => p.month === month && p.method === 'bank' && p.status === 'approved');
            const header = 'DRN,Name,Amount,Method,Month';
            const rows = payments.map(p => `${p.drn},"${(p.name||'').replace(/"/g,'""')}",${p.amount},${p.method},${p.month}`);
            const csv = [header, ...rows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="bank_batch_${month}.csv"`);
            return res.status(200).send(csv);
        }
        if (action === 'export-cash-csv' && month) {
            const payments = (bonusData.payments || []).filter(p => p.month === month && p.method === 'cash' && p.status === 'approved');
            const header = 'Branch,DRN,Name,Amount,Signature,Month';
            const rows = payments.map(p => `${p.branch || ''},${p.drn},"${(p.name||'').replace(/"/g,'""')}",${p.amount},,${p.month}`);
            const csv = [header, ...rows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="cash_sheet_${month}.csv"`);
            return res.status(200).send(csv);
        }
        
        // Default: return all data
        return res.status(200).json(bonusData);
    }
    
    if (req.method === 'POST') {
        const { action, ...data } = req.body;
        
        if (action === 'set-config') {
            if (!requireRole(['finance_manager', 'gm', 'director'])) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            bonusData.config = { ...(bonusData.config || {}), ...(data || {}) };
            saveBonusData(bonusData);
            logAudit({ type: 'config_updated' });
            return res.status(200).json(bonusData.config);
        }
        
        // Upload monthly bonus CSV data
        if (action === 'upload') {
            const month = data.month || getMonthKey(new Date());
            const { items, uploadedBy, integrityHash } = data;
            
            // Check if month already exists
            const existingIndex = bonusData.monthlyUploads?.findIndex(u => u.month === month);
            
            const serverHash = crypto.createHash('sha256').update(JSON.stringify(items || [])).digest('hex');
            const upload = {
                month,
                createdAt: new Date().toISOString(),
                uploadedBy: uploadedBy || 'system',
                items: items || [],
                totalRecords: items?.length || 0,
                totalAmount: items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
                status: 'pending_approval',
                approvals: [],
                integrity: { client: integrityHash || null, server: serverHash }
            };
            
            if (existingIndex >= 0) {
                bonusData.monthlyUploads[existingIndex] = upload;
            } else {
                if (!bonusData.monthlyUploads) bonusData.monthlyUploads = [];
                bonusData.monthlyUploads.push(upload);
            }
            
            logAudit({ type: 'upload_created', month, records: upload.totalRecords, totalAmount: upload.totalAmount });
            saveBonusData(bonusData);
            notify({ kind: 'upload_created', month });
            return res.status(201).json(upload);
        }
        
        // Request or record payment (enters approval flow for bank or large amounts)
        if (action === 'payment') {
            const { drn, month, method, amount, paidBy, branch, notes } = data;
            
            if (!drn || !month || !method) {
                return res.status(400).json({ error: 'Missing required fields: drn, month, method' });
            }
            
            // Verify distributor exists in approved monthly upload
            const upload = bonusData.monthlyUploads?.find(u => u.month === month);
            if (!upload) {
                return res.status(404).json({ error: `No bonus upload found for month ${month}` });
            }
            if (upload.status !== 'approved') {
                return res.status(409).json({ error: `Monthly upload ${month} is ${upload.status}. Approve before recording payments.` });
            }
            
            const distributor = upload.items?.find(i => i.drn === drn);
            if (!distributor) {
                return res.status(404).json({ 
                    error: `Distributor ${drn} not found in bonus upload for ${month}. Cannot process payment.` 
                });
            }
            
            // Check if payment already exists
            const existingPaymentIndex = bonusData.payments?.findIndex(p => 
                p.drn === drn && p.month === month
            );
            if (existingPaymentIndex >= 0) {
                return res.status(409).json({ error: 'Payment already exists for this DRN and month' });
            }

            // Overpayment guard
            const targetAmount = amount || distributor.amount;
            if (targetAmount > distributor.amount) {
                // require approver override later via approval step
            }
            
            const payment = {
                drn,
                name: distributor.name,
                month,
                method, // 'cash' or 'bank'
                amount: targetAmount,
                status: (method === 'bank' || targetAmount > (bonusData.config?.secondApproverThreshold || 5000)) ? 'pending_approval' : 'approved',
                paidAt: null,
                paidBy: paidBy || userName,
                branch: method === 'cash' ? branch : null,
                notes: notes || ''
            };
            
            if (existingPaymentIndex >= 0) {
                bonusData.payments[existingPaymentIndex] = payment;
            } else {
                if (!bonusData.payments) bonusData.payments = [];
                bonusData.payments.push(payment);
            }
            
            logAudit({ type: 'payment_created', month, drn, method, amount: payment.amount, status: payment.status });
            if (payment.status === 'pending_approval') notify({ kind: 'payment_approval_required', month, drn, amount: payment.amount });
            saveBonusData(bonusData);
            return res.status(201).json(payment);
        }

        // Approvals
        if (action === 'approve-upload') {
            if (!requireRole(['finance_manager', 'gm', 'director'])) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const { month } = data;
            const uploadIndex = bonusData.monthlyUploads?.findIndex(u => u.month === month);
            if (uploadIndex === -1) return res.status(404).json({ error: 'Upload not found' });
            const upload = bonusData.monthlyUploads[uploadIndex];
            upload.status = 'approved';
            upload.approvals = [...(upload.approvals || []), { by: userName, role: userRole, at: new Date().toISOString() }];
            bonusData.monthlyUploads[uploadIndex] = upload;
            logAudit({ type: 'upload_approved', month });
            saveBonusData(bonusData);
            notify({ kind: 'upload_approved', month });
            return res.status(200).json(upload);
        }
        if (action === 'reject-upload') {
            if (!requireRole(['finance_manager', 'gm', 'director'])) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const { month, reason } = data;
            const uploadIndex = bonusData.monthlyUploads?.findIndex(u => u.month === month);
            if (uploadIndex === -1) return res.status(404).json({ error: 'Upload not found' });
            const upload = bonusData.monthlyUploads[uploadIndex];
            upload.status = 'rejected';
            upload.rejection = { by: userName, role: userRole, at: new Date().toISOString(), reason: reason || '' };
            bonusData.monthlyUploads[uploadIndex] = upload;
            logAudit({ type: 'upload_rejected', month, reason: reason || '' });
            saveBonusData(bonusData);
            notify({ kind: 'upload_rejected', month });
            return res.status(200).json(upload);
        }

        if (action === 'approve-payment') {
            if (!requireRole(['finance_manager', 'gm', 'director'])) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const { drn, month } = data;
            const idx = bonusData.payments?.findIndex(p => p.drn === drn && p.month === month);
            if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
            bonusData.payments[idx].status = 'approved';
            bonusData.payments[idx].approvedAt = new Date().toISOString();
            bonusData.payments[idx].approvedBy = userName;
            logAudit({ type: 'payment_approved', month, drn });
            saveBonusData(bonusData);
            notify({ kind: 'payment_approved', month, drn });
            return res.status(200).json(bonusData.payments[idx]);
        }
        if (action === 'disburse-payment') {
            if (!requireRole(['finance_manager', 'gm', 'director'])) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const { drn, month } = data;
            const idx = bonusData.payments?.findIndex(p => p.drn === drn && p.month === month);
            if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
            if (bonusData.payments[idx].status !== 'approved') {
                return res.status(409).json({ error: 'Payment must be approved before disbursement' });
            }
            bonusData.payments[idx].status = 'disbursed';
            bonusData.payments[idx].paidAt = new Date().toISOString();
            bonusData.payments[idx].paidBy = userName;
            logAudit({ type: 'payment_disbursed', month, drn });
            saveBonusData(bonusData);
            notify({ kind: 'payment_disbursed', month, drn });
            return res.status(200).json(bonusData.payments[idx]);
        }
        
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    if (req.method === 'PUT') {
        const { action, ...data } = req.body;
        
        // Update payment status
        if (action === 'update-payment') {
            const { drn, month, ...updates } = data;
            
            if (!bonusData.payments) {
                return res.status(404).json({ error: 'No payments found' });
            }
            
            const paymentIndex = bonusData.payments.findIndex(p => 
                p.drn === drn && p.month === month
            );
            
            if (paymentIndex === -1) {
                return res.status(404).json({ error: 'Payment not found' });
            }
            
            bonusData.payments[paymentIndex] = {
                ...bonusData.payments[paymentIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            saveBonusData(bonusData);
            return res.status(200).json(bonusData.payments[paymentIndex]);
        }
        
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    if (req.method === 'DELETE') {
        const { action, month, drn } = req.query;
        
        // Delete monthly upload
        if (action === 'upload' && month) {
            if (!requireRole(['finance_manager', 'gm', 'director'])) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            if (!bonusData.monthlyUploads) {
                return res.status(404).json({ error: 'No uploads found' });
            }
            
            const index = bonusData.monthlyUploads.findIndex(u => u.month === month);
            if (index === -1) {
                return res.status(404).json({ error: 'Upload not found' });
            }
            
            bonusData.monthlyUploads.splice(index, 1);
            // Also remove related payments
            if (bonusData.payments) {
                bonusData.payments = bonusData.payments.filter(p => p.month !== month);
            }
            logAudit({ type: 'upload_deleted', month });
            
            saveBonusData(bonusData);
            return res.status(200).json({ message: 'Upload deleted successfully' });
        }
        
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
}

