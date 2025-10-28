// GM Portal - Business Transactions API
// Provides transaction data for the GM portal monitoring dashboard

export async function getTransactions(filters = {}) {
    try {
        // Load reports data
        const reportsData = await fetch('/reports_data.json').then(r => r.json());
        const reports = reportsData.reports || [];
        
        // Load clients data
        const clientsData = await fetch('/api/clients.js').then(r => r.json()).catch(() => ({ clients: [] }));
        const clients = clientsData.clients || [];
        
        // Transform reports into transactions
        const transactions = reports.map((report, index) => {
            // Calculate total value from products
            let totalAmount = 0;
            if (report.products && Array.isArray(report.products)) {
                report.products.forEach(product => {
                    const quantity = parseFloat(product.quantity) || 0;
                    const price = parseFloat(product.price) || 0;
                    totalAmount += quantity * price;
                });
            }
            
            // Get client details
            const client = clients.find(c => c.name === report.clientName);
            
            return {
                id: `TXN-${report.id || index + 1}`,
                reportId: report.id,
                clientName: report.clientName || 'Unknown Client',
                clientId: client?.id || null,
                branch: report.branch || 'Unknown',
                amount: totalAmount.toFixed(2),
                date: report.date || new Date().toISOString().split('T')[0],
                status: report.status || 'completed',
                type: 'Product Sale',
                products: report.products || [],
                timestamp: report.timestamp || new Date().toISOString(),
                notes: report.notes || ''
            };
        });
        
        // Apply filters
        let filtered = transactions;
        
        if (filters.dateRange) {
            const now = new Date();
            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.date);
                
                switch (filters.dateRange) {
                    case 'today':
                        return t.date === now.toISOString().split('T')[0];
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return transactionDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return transactionDate >= monthAgo;
                    case 'year':
                        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        return transactionDate >= yearAgo;
                    default:
                        return true;
                }
            });
        }
        
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(t => t.status === filters.status);
        }
        
        if (filters.branch && filters.branch !== 'all') {
            filtered = filtered.filter(t => t.branch === filters.branch);
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(t => 
                t.id.toLowerCase().includes(searchTerm) ||
                t.clientName.toLowerCase().includes(searchTerm) ||
                t.branch.toLowerCase().includes(searchTerm)
            );
        }
        
        // Calculate statistics
        const stats = calculateStatistics(filtered, transactions);
        
        return {
            transactions: filtered,
            total: filtered.length,
            stats: stats
        };
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        
        // Return empty structure on error
        return {
            transactions: [],
            total: 0,
            stats: {
                totalRevenue: 0,
                transactionsToday: 0,
                activeClients: 0,
                pendingOrders: 0
            }
        };
    }
}

function calculateStatistics(filtered, allTransactions) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Total revenue from filtered transactions
    const totalRevenue = filtered.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Transactions today
    const transactionsToday = allTransactions.filter(t => t.date === today).length;
    
    // Active clients (unique client names)
    const activeClients = new Set(filtered.map(t => t.clientName)).size;
    
    // Pending orders
    const pendingOrders = allTransactions.filter(t => t.status === 'pending').length;
    
    return {
        totalRevenue: totalRevenue.toFixed(2),
        transactionsToday,
        activeClients,
        pendingOrders
    };
}

export async function getTransactionSummary() {
    try {
        const reportsData = await fetch('/reports_data.json').then(r => r.json());
        const reports = reportsData.reports || [];
        
        // Calculate monthly summary
        const monthlyStats = {};
        
        reports.forEach(report => {
            if (report.date) {
                const date = new Date(report.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyStats[monthKey]) {
                    monthlyStats[monthKey] = {
                        month: monthKey,
                        revenue: 0,
                        transactions: 0,
                        clients: new Set()
                    };
                }
                
                let totalAmount = 0;
                if (report.products && Array.isArray(report.products)) {
                    report.products.forEach(product => {
                        const quantity = parseFloat(product.quantity) || 0;
                        const price = parseFloat(product.price) || 0;
                        totalAmount += quantity * price;
                    });
                }
                
                monthlyStats[monthKey].revenue += totalAmount;
                monthlyStats[monthKey].transactions += 1;
                monthlyStats[monthKey].clients.add(report.clientName);
            }
        });
        
        // Convert to array
        const summary = Object.values(monthlyStats).map(stat => ({
            month: stat.month,
            revenue: stat.revenue.toFixed(2),
            transactions: stat.transactions,
            activeClients: stat.clients.size
        }));
        
        return summary;
        
    } catch (error) {
        console.error('Error calculating summary:', error);
        return [];
    }
}

export async function getBranchPerformance() {
    try {
        const reportsData = await fetch('/reports_data.json').then(r => r.json());
        const reports = reportsData.reports || [];
        
        const branchStats = {};
        
        reports.forEach(report => {
            const branch = report.branch || 'Unknown';
            
            if (!branchStats[branch]) {
                branchStats[branch] = {
                    branch: branch,
                    revenue: 0,
                    transactions: 0,
                    clients: new Set()
                };
            }
            
            let totalAmount = 0;
            if (report.products && Array.isArray(report.products)) {
                report.products.forEach(product => {
                    const quantity = parseFloat(product.quantity) || 0;
                    const price = parseFloat(product.price) || 0;
                    totalAmount += quantity * price;
                });
            }
            
            branchStats[branch].revenue += totalAmount;
            branchStats[branch].transactions += 1;
            branchStats[branch].clients.add(report.clientName);
        });
        
        // Convert to array and add calculated fields
        const performance = Object.values(branchStats).map(stat => ({
            branch: stat.branch,
            revenue: stat.revenue.toFixed(2),
            transactions: stat.transactions,
            activeClients: stat.clients.size,
            avgTransactionValue: (stat.revenue / stat.transactions).toFixed(2)
        }));
        
        // Sort by revenue descending
        performance.sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));
        
        return performance;
        
    } catch (error) {
        console.error('Error calculating branch performance:', error);
        return [];
    }
}

// CommonJS support (for Node.js environments)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getTransactions, getTransactionSummary, getBranchPerformance };
}
