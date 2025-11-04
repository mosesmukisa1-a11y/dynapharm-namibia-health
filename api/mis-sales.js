// MIS Sales API: validation, storage, reconciliation, reporting, audit (client-side module)

const STORAGE_KEYS = {
    drafts: 'mis_sales_drafts',
    verified: 'mis_sales_verified',
    audit: 'mis_sales_audit'
};

function safeGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function safeSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export function getBranches() {
    // Fallback list; can be replaced by existing branches source if available
    return [
        { id: 'townshop', name: 'TOWNSHOP (Head Office)' },
        { id: 'khomasdal', name: 'KHOMASDAL DPC' },
        { id: 'rundu', name: 'RUNDU DPC' },
        { id: 'walvisbay', name: 'WALVISBAY' },
        { id: 'oshakati', name: 'OSHAKATI DPC' }
    ];
}

async function loadProducts() {
    // Reuse price list present in big app if accessible; otherwise empty
    try {
        // Attempt to pull from complete system namespace if exposed
        return window.PRICE_LIST ? window.PRICE_LIST.map(p => ({
            sku: p.description,
            name: p.description,
            price: { dp: p.dp, cp: p.cp }
        })) : [];
    } catch { return []; }
}

async function loadDistributors() {
    // Try reuse distributors if present (from complete system). Otherwise empty; validation will be soft.
    try { return window.distributors || []; } catch { return []; }
}

export async function loadCatalogs() {
    const [products, distributors] = await Promise.all([loadProducts(), loadDistributors()]);
    return { products, distributors };
}

function validateDistributor(line, catalogs) {
    const name = (line.distributorName || '').toLowerCase();
    const nb = (line.distributorNb || '').toLowerCase();
    const list = catalogs.distributors || [];
    if (!name && !nb) return null;
    const match = list.find(d => {
        const dn = (d.distributorName || d.name || '').toLowerCase();
        const dc = (d.distributorCode || d.code || '').toLowerCase();
        return (name && dn.includes(name)) || (nb && dc === nb);
    });
    return !!match;
}

function validateProduct(line, catalogs) {
    const sku = (line.sku || '').toLowerCase();
    const list = catalogs.products || [];
    if (!sku) return null;
    const match = list.find(p => (p.sku || p.name || '').toLowerCase() === sku);
    if (match) return true;
    // fuzzy contains
    return list.some(p => (p.sku || p.name || '').toLowerCase().includes(sku));
}

function appendAudit(entry) {
    const audit = safeGet(STORAGE_KEYS.audit, []);
    audit.unshift(entry);
    safeSet(STORAGE_KEYS.audit, audit);
}

export async function createSalesDraft(draft, user, catalogs) {
    // Validate each line soft, attach notes
    draft.lines = (draft.lines || []).map(l => {
        const dist = validateDistributor(l, catalogs);
        const prod = validateProduct(l, catalogs);
        const notes = [];
        if (dist === false) notes.push('Unknown distributor');
        if (prod === false) notes.push('Unknown product');
        return { ...l, validation: { distributor: dist, product: prod, notes } };
    });
    const drafts = safeGet(STORAGE_KEYS.drafts, []);
    const existingIdx = drafts.findIndex(d => d.id === draft.id);
    const saved = { ...draft, savedAt: new Date().toISOString(), user: { username: user.username, fullName: user.fullName } };
    if (existingIdx >= 0) drafts[existingIdx] = saved; else drafts.unshift(saved);
    safeSet(STORAGE_KEYS.drafts, drafts);
    appendAudit({ timestamp: new Date().toISOString(), user, action: 'draft.save', recordId: draft.id, diff: `${draft.lines.length} lines`, version: (saved.version||0)+1 });
    return saved;
}

export async function verifySalesLines(draft, tempIds, user, catalogs) {
    const drafts = safeGet(STORAGE_KEYS.drafts, []);
    const idx = drafts.findIndex(d => d.id === draft.id);
    if (idx === -1) return draft;
    const verifiedLines = [];
    const nextLines = (draft.lines || []).map(l => {
        if (!tempIds.includes(l.tempId)) return l;
        const dist = validateDistributor(l, catalogs);
        const prod = validateProduct(l, catalogs);
        const canVerify = dist !== false && prod !== false && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0;
        const status = canVerify ? 'verified' : 'error';
        const notes = [];
        if (dist === false) notes.push('Unknown distributor');
        if (prod === false) notes.push('Unknown product');
        const line = { ...l, status, validation: { distributor: dist, product: prod, notes }, verifiedAt: canVerify ? new Date().toISOString() : undefined, verifiedBy: canVerify ? user.fullName : undefined };
        if (canVerify) verifiedLines.push(line);
        return line;
    });

    const updated = { ...draft, lines: nextLines };
    drafts[idx] = updated;
    safeSet(STORAGE_KEYS.drafts, drafts);

    if (verifiedLines.length > 0) {
        const verified = safeGet(STORAGE_KEYS.verified, []);
        verifiedLines.forEach(l => verified.unshift({ ...l, draftId: draft.id, id: 'S' + Date.now() + Math.random().toString(16).slice(2) }));
        safeSet(STORAGE_KEYS.verified, verified);
        appendAudit({ timestamp: new Date().toISOString(), user, action: 'sales.verify', recordId: draft.id, diff: `${verifiedLines.length} lines verified` });
    }
    return updated;
}

export async function parseCsvFile(file) {
    const text = await file.text();
    const [header, ...rows] = text.split(/\r?\n/).filter(Boolean);
    const headers = header.split(',').map(h => h.trim());
    return rows.map(r => {
        const cols = r.split(',');
        const row = {};
        headers.forEach((h, i) => row[h] = (cols[i]||'').trim());
        return row;
    });
}

export async function getBranchSyncStatus(date) {
    // Minimal synthetic status based on verified store
    const verified = safeGet(STORAGE_KEYS.verified, []);
    const byBranch = new Map();
    verified.forEach(v => {
        const b = v.branch || 'unknown';
        const d = (v.timestamp||'').slice(0,10);
        if (date && d !== date) return;
        const cur = byBranch.get(b) || { branch: b, draft: 0, verified: 0 };
        cur.verified += 1; byBranch.set(b, cur);
    });
    const encoded = Array.from(byBranch.values());
    const branches = getBranches();
    const pending = branches.map(b => ({ branch: b.name, pending: Math.max(0, 0), lastUpload: null }));
    const reconciliation = branches.map(b => ({ branch: b.name, matched: 0, unmatched: 0, discrepancies: 0 }));
    return { pending, encoded, reconciliation };
}

export async function reconcilePeriod({ start, end }) {
    // Minimal reconciliation: compare encoded vs placeholders for stock/finance
    const verified = safeGet(STORAGE_KEYS.verified, []);
    const rows = verified.filter(v => (!start || v.timestamp >= start) && (!end || v.timestamp <= (end + 'T23:59:59')));
    // Placeholder: stockQty and financeValue unknown; mark matched if validations were OK
    return rows.map(v => ({
        distributorName: v.distributorName,
        sku: v.sku,
        quantity: Number(v.quantity) || 0,
        encodedValue: (Number(v.quantity)||0) * (Number(v.unitPrice)||0),
        stockQty: null,
        financeValue: null,
        status: (v.validation?.distributor !== false && v.validation?.product !== false) ? 'matched' : 'unmatched',
        notes: (v.validation?.notes||[]).join('; ')
    }));
}

export async function buildEncodedSalesReport({ start, end, branch }) {
    const verified = safeGet(STORAGE_KEYS.verified, []);
    const rows = verified.filter(v => (!start || v.timestamp >= start) && (!end || v.timestamp <= (end + 'T23:59:59')) && (branch==='all' || v.branch === branch));
    const totals = rows.reduce((a, r) => { a.qty += Number(r.quantity)||0; a.value += (Number(r.quantity)||0)*(Number(r.unitPrice)||0); return a; }, { qty: 0, value: 0 });
    const byBranch = new Map();
    rows.forEach(r => { const key = r.branch || 'unknown'; const cur = byBranch.get(key) || { branch: key, qty: 0, value: 0 }; cur.qty += Number(r.quantity)||0; cur.value += (Number(r.quantity)||0)*(Number(r.unitPrice)||0); byBranch.set(key, cur); });
    const branchRows = Array.from(byBranch.values());

    const html = `
        <div class="section">
            <h2>Encoded Sales Report</h2>
            <div class="help">Period: ${start||'-'} to ${end||'-'} | Branch: ${branch||'all'}</div>
            <div class="grid mt-12">
                <div class="col-4"><div class="pill">Total Qty: ${totals.qty}</div></div>
                <div class="col-4"><div class="pill">Total Value: N$ ${totals.value.toFixed(2)}</div></div>
                <div class="col-4"><div class="pill">Entries: ${rows.length}</div></div>
            </div>
            <div class="mt-12">
                <table><thead><tr><th>Branch</th><th>Qty</th><th>Value</th></tr></thead><tbody>
                    ${branchRows.map(b => `<tr><td>${b.branch}</td><td>${b.qty}</td><td>N$ ${b.value.toFixed(2)}</td></tr>`).join('')}
                </tbody></table>
            </div>
        </div>`;

    const csvHeaders = ['distributorName','distributorNb','sku','quantity','unitPrice','branch','timestamp','value'];
    const csvRows = rows.map(r => [r.distributorName, r.distributorNb, r.sku, r.quantity, r.unitPrice, r.branch, r.timestamp, (Number(r.quantity)||0)*(Number(r.unitPrice)||0)]);
    const meta = { start, end, branch, totals };
    return { html, csvHeaders, csvRows, meta };
}

export async function submitReport(meta, recipients) {
    appendAudit({ timestamp: new Date().toISOString(), user: { username: 'system' }, action: 'report.submit', recordId: `${meta.start||''}_${meta.end||''}_${meta.branch||'all'}`, diff: `recipients=${recipients.join(',')}` });
    return { success: true };
}

export async function getAuditLogs({ start, end, branch }) {
    const logs = safeGet(STORAGE_KEYS.audit, []);
    return logs.filter(l => (!start || l.timestamp >= start) && (!end || l.timestamp <= (end + 'T23:59:59')));
}

export function exportCsv(filename, headers, rows) {
    const csv = [headers.join(',')].concat(rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? '"' + v.replace(/"/g,'""') + '"' : v).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.style.display = 'none';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ==================== NEW FUNCTIONS FOR DAILY RECEIPTS AND STOCK SALES ====================

/**
 * Get all daily receipts from all branches
 * Aggregates data from reports and walk-in sales
 */
export async function getDailyReceipts(date) {
    try {
        // Access localStorage directly for reports and sales
        const reports = JSON.parse(localStorage.getItem('dyna_reports') || '[]');
        const walkInSales = JSON.parse(localStorage.getItem('dyna_walkin_sales') || '[]');
        const dynapharmWalkInSales = JSON.parse(localStorage.getItem('dynapharm_walkin_sales') || '[]');
        
        const allReceipts = [];
        const targetDate = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
        
        // Process reports (prescription-based receipts)
        reports.forEach(report => {
            if (!report.dispensed || !report.dispensedAt) return;
            const reportDate = report.dispensedAt.slice(0, 10);
            if (reportDate !== targetDate) return;
            
            // Calculate total from products
            let totalAmount = 0;
            const products = report.products || report.medicines || [];
            products.forEach(p => {
                const qty = parseFloat(p.quantity || 0);
                const price = parseFloat(p.price || p.amountPaid || 0);
                totalAmount += qty * price;
            });
            
            allReceipts.push({
                id: report.id || `RPT-${Date.now()}`,
                type: 'prescription',
                branch: report.branch || 'Unknown',
                clientName: report.clientName || 'Unknown',
                clientId: report.clientId || null,
                date: reportDate,
                timestamp: report.dispensedAt || report.timestamp,
                totalAmount: totalAmount,
                products: products,
                consultant: report.consultant || '',
                dispensedBy: report.dispensedBy || '',
                receiptNumber: report.receiptNumber || `RCP-${report.id}`
            });
        });
        
        // Process walk-in sales
        [...walkInSales, ...dynapharmWalkInSales].forEach(sale => {
            const saleDate = (sale.timestamp || sale.createdAt || sale.date || '').slice(0, 10);
            if (saleDate !== targetDate) return;
            
            allReceipts.push({
                id: sale.id || `WIN-${Date.now()}`,
                type: 'walk-in',
                branch: sale.branch || 'Unknown',
                clientName: sale.customerName || sale.clientName || 'Walk-in Customer',
                clientId: sale.clientId || null,
                date: saleDate,
                timestamp: sale.timestamp || sale.createdAt || sale.date,
                totalAmount: parseFloat(sale.total || sale.totalAmount || 0),
                products: sale.items || sale.products || [],
                dispensedBy: sale.soldBy || sale.cashier || '',
                receiptNumber: sale.receiptNumber || sale.id || `RCP-${sale.id}`
            });
        });
        
        // Sort by timestamp
        allReceipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return allReceipts;
    } catch (error) {
        console.error('Error getting daily receipts:', error);
        return [];
    }
}

/**
 * Get all receipts for a date range
 */
export async function getReceiptsByDateRange(startDate, endDate, branchFilter = 'all') {
    try {
        // Access localStorage directly for reports and sales
        const reports = JSON.parse(localStorage.getItem('dyna_reports') || '[]');
        const walkInSales = JSON.parse(localStorage.getItem('dyna_walkin_sales') || '[]');
        const dynapharmWalkInSales = JSON.parse(localStorage.getItem('dynapharm_walkin_sales') || '[]');
        
        const allReceipts = [];
        const start = startDate ? startDate.slice(0, 10) : '';
        const end = endDate ? endDate.slice(0, 10) + 'T23:59:59' : '';
        
        // Process reports
        reports.forEach(report => {
            if (!report.dispensed || !report.dispensedAt) return;
            const reportDate = report.dispensedAt.slice(0, 10);
            if (start && reportDate < start) return;
            if (end && reportDate > end.slice(0, 10)) return;
            if (branchFilter !== 'all' && report.branch !== branchFilter) return;
            
            let totalAmount = 0;
            const products = report.products || report.medicines || [];
            products.forEach(p => {
                const qty = parseFloat(p.quantity || 0);
                const price = parseFloat(p.price || p.amountPaid || 0);
                totalAmount += qty * price;
            });
            
            allReceipts.push({
                id: report.id || `RPT-${Date.now()}`,
                type: 'prescription',
                branch: report.branch || 'Unknown',
                clientName: report.clientName || 'Unknown',
                date: reportDate,
                timestamp: report.dispensedAt,
                totalAmount: totalAmount,
                products: products
            });
        });
        
        // Process walk-in sales
        [...walkInSales, ...dynapharmWalkInSales].forEach(sale => {
            const saleDate = (sale.timestamp || sale.createdAt || sale.date || '').slice(0, 10);
            if (start && saleDate < start) return;
            if (end && saleDate > end.slice(0, 10)) return;
            if (branchFilter !== 'all' && sale.branch !== branchFilter) return;
            
            allReceipts.push({
                id: sale.id || `WIN-${Date.now()}`,
                type: 'walk-in',
                branch: sale.branch || 'Unknown',
                clientName: sale.customerName || sale.clientName || 'Walk-in Customer',
                date: saleDate,
                timestamp: sale.timestamp || sale.createdAt || sale.date,
                totalAmount: parseFloat(sale.total || sale.totalAmount || 0),
                products: sale.items || sale.products || []
            });
        });
        
        allReceipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return allReceipts;
    } catch (error) {
        console.error('Error getting receipts by date range:', error);
        return [];
    }
}

/**
 * Get stock sold data per branch
 * Aggregates from reports and walk-in sales
 */
export async function getStockSoldPerBranch(startDate, endDate, branchFilter = 'all') {
    try {
        // Access localStorage directly for reports and sales
        const reports = JSON.parse(localStorage.getItem('dyna_reports') || '[]');
        const walkInSales = JSON.parse(localStorage.getItem('dyna_walkin_sales') || '[]');
        const dynapharmWalkInSales = JSON.parse(localStorage.getItem('dynapharm_walkin_sales') || '[]');
        
        const stockSold = new Map(); // Map: branch -> product -> { quantity, amount }
        const start = startDate ? startDate.slice(0, 10) : '';
        const end = endDate ? endDate.slice(0, 10) : '';
        
        // Process reports
        reports.forEach(report => {
            if (!report.dispensed || !report.dispensedAt) return;
            const reportDate = report.dispensedAt.slice(0, 10);
            if (start && reportDate < start) return;
            if (end && reportDate > end) return;
            
            const branch = report.branch || 'Unknown';
            if (branchFilter !== 'all' && branch !== branchFilter) return;
            
            const products = report.products || report.medicines || [];
            products.forEach(p => {
                const productName = p.name || p.description || p.product || 'Unknown';
                const qty = parseFloat(p.quantity || 0);
                const price = parseFloat(p.price || p.amountPaid || 0);
                const amount = qty * price;
                
                if (!stockSold.has(branch)) {
                    stockSold.set(branch, new Map());
                }
                const branchStock = stockSold.get(branch);
                
                if (!branchStock.has(productName)) {
                    branchStock.set(productName, { quantity: 0, amount: 0, productName });
                }
                const productData = branchStock.get(productName);
                productData.quantity += qty;
                productData.amount += amount;
            });
        });
        
        // Process walk-in sales
        [...walkInSales, ...dynapharmWalkInSales].forEach(sale => {
            const saleDate = (sale.timestamp || sale.createdAt || sale.date || '').slice(0, 10);
            if (start && saleDate < start) return;
            if (end && saleDate > end) return;
            
            const branch = sale.branch || 'Unknown';
            if (branchFilter !== 'all' && branch !== branchFilter) return;
            
            const items = sale.items || sale.products || [];
            items.forEach(item => {
                const productName = item.name || item.description || item.product || 'Unknown';
                const qty = parseFloat(item.quantity || 0);
                const price = parseFloat(item.price || item.unitPrice || 0);
                const amount = qty * price;
                
                if (!stockSold.has(branch)) {
                    stockSold.set(branch, new Map());
                }
                const branchStock = stockSold.get(branch);
                
                if (!branchStock.has(productName)) {
                    branchStock.set(productName, { quantity: 0, amount: 0, productName });
                }
                const productData = branchStock.get(productName);
                productData.quantity += qty;
                productData.amount += amount;
            });
        });
        
        // Convert to array format
        const result = [];
        stockSold.forEach((products, branch) => {
            products.forEach((data, productName) => {
                result.push({
                    branch,
                    productName,
                    quantity: data.quantity,
                    amount: data.amount,
                    date: start || end || new Date().toISOString().slice(0, 10)
                });
            });
        });
        
        return result;
    } catch (error) {
        console.error('Error getting stock sold per branch:', error);
        return [];
    }
}

/**
 * Generate monthly stock sold report
 */
export async function getMonthlyStockSoldReport(year, month, branchFilter = 'all') {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    return await getStockSoldPerBranch(startDate, endDate, branchFilter);
}

/**
 * Export stock sold data to Excel format (CSV with proper formatting)
 */
export function exportStockSoldToExcel(data, filename = 'stock-sold-report.xlsx') {
    // Group by branch
    const byBranch = new Map();
    data.forEach(item => {
        if (!byBranch.has(item.branch)) {
            byBranch.set(item.branch, []);
        }
        byBranch.get(item.branch).push(item);
    });
    
    // Create CSV content with multiple sheets simulation (using CSV format)
    let csvContent = '';
    
    // Summary sheet
    csvContent += 'STOCK SOLD SUMMARY BY BRANCH\n\n';
    csvContent += 'Branch,Product,Quantity Sold,Total Amount (N$)\n';
    const summary = new Map();
    data.forEach(item => {
        const key = `${item.branch}|${item.productName}`;
        if (!summary.has(key)) {
            summary.set(key, { branch: item.branch, product: item.productName, qty: 0, amount: 0 });
        }
        const s = summary.get(key);
        s.qty += item.quantity;
        s.amount += item.amount;
    });
    summary.forEach(s => {
        csvContent += `"${s.branch}","${s.product}",${s.qty},${s.amount.toFixed(2)}\n`;
    });
    
    // Branch sheets
    byBranch.forEach((items, branch) => {
        csvContent += `\n\n=== ${branch} ===\n\n`;
        csvContent += 'Product,Quantity Sold,Total Amount (N$)\n';
        items.forEach(item => {
            csvContent += `"${item.productName}",${item.quantity},${item.amount.toFixed(2)}\n`;
        });
    });
    
    // Create and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.xlsx', '.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export daily receipts to Excel format
 */
export function exportDailyReceiptsToExcel(receipts, filename = 'daily-receipts.xlsx') {
    const headers = ['Receipt Number', 'Type', 'Branch', 'Client Name', 'Date', 'Time', 'Total Amount (N$)', 'Product Count'];
    const rows = receipts.map(r => [
        r.receiptNumber || r.id,
        r.type === 'prescription' ? 'Prescription' : 'Walk-in',
        r.branch,
        r.clientName,
        r.date,
        new Date(r.timestamp).toLocaleTimeString(),
        r.totalAmount.toFixed(2),
        (r.products || []).length
    ]);
    
    exportCsv(filename.replace('.xlsx', '.csv'), headers, rows);
}


