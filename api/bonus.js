import fs from 'fs';
import path from 'path';

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
    
    if (req.method === 'GET') {
        const { action, month, distributor, drn } = req.query;
        
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
        
        // Default: return all data
        return res.status(200).json(bonusData);
    }
    
    if (req.method === 'POST') {
        const { action, ...data } = req.body;
        
        // Upload monthly bonus CSV data
        if (action === 'upload') {
            const month = data.month || getMonthKey(new Date());
            const { items, uploadedBy } = data;
            
            // Check if month already exists
            const existingIndex = bonusData.monthlyUploads?.findIndex(u => u.month === month);
            
            const upload = {
                month,
                createdAt: new Date().toISOString(),
                uploadedBy: uploadedBy || 'system',
                items: items || [],
                totalRecords: items?.length || 0,
                totalAmount: items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
            };
            
            if (existingIndex >= 0) {
                bonusData.monthlyUploads[existingIndex] = upload;
            } else {
                if (!bonusData.monthlyUploads) bonusData.monthlyUploads = [];
                bonusData.monthlyUploads.push(upload);
            }
            
            saveBonusData(bonusData);
            return res.status(201).json(upload);
        }
        
        // Record payment
        if (action === 'payment') {
            const { drn, month, method, amount, paidBy, branch, notes, status = 'paid' } = data;
            
            if (!drn || !month || !method) {
                return res.status(400).json({ error: 'Missing required fields: drn, month, method' });
            }
            
            // Verify distributor exists in monthly upload
            const upload = bonusData.monthlyUploads?.find(u => u.month === month);
            if (!upload) {
                return res.status(404).json({ error: `No bonus upload found for month ${month}` });
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
            
            const payment = {
                drn,
                name: distributor.name,
                month,
                method, // 'cash' or 'bank'
                amount: amount || distributor.amount,
                status,
                paidAt: new Date().toISOString(),
                paidBy: paidBy || 'system',
                branch: method === 'cash' ? branch : null,
                notes: notes || ''
            };
            
            if (existingPaymentIndex >= 0) {
                bonusData.payments[existingPaymentIndex] = payment;
            } else {
                if (!bonusData.payments) bonusData.payments = [];
                bonusData.payments.push(payment);
            }
            
            saveBonusData(bonusData);
            return res.status(201).json(payment);
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
            
            saveBonusData(bonusData);
            return res.status(200).json({ message: 'Upload deleted successfully' });
        }
        
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
}

