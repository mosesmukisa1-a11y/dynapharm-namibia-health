// Stock Request Management API
// Handles stock requests, approvals, and fulfillment workflow

let stockRequests = [];
let stockTransfers = [];
let warehouseStock = {};
let warehouses = [
    { id: 'warehouse-windhoek', name: 'Warehouse Windhoek', manager: '', location: 'Windhoek' },
    { id: 'warehouse-ondangwa', name: 'Warehouse Ondangwa', manager: '', location: 'Ondangwa' }
];

// Initialize from localStorage
function loadStockData() {
    try {
        const storedRequests = localStorage.getItem('dyna_stock_requests');
        const storedTransfers = localStorage.getItem('dyna_stock_transfers');
        const storedWarehouseStock = localStorage.getItem('dyna_warehouse_stock');
        
        if (storedRequests) stockRequests = JSON.parse(storedRequests);
        if (storedTransfers) stockTransfers = JSON.parse(storedTransfers);
        if (storedWarehouseStock) warehouseStock = JSON.parse(storedWarehouseStock);
    } catch (error) {
        console.error('Error loading stock data:', error);
    }
}

function saveStockData() {
    try {
        localStorage.setItem('dyna_stock_requests', JSON.stringify(stockRequests));
        localStorage.setItem('dyna_stock_transfers', JSON.stringify(stockTransfers));
        localStorage.setItem('dyna_warehouse_stock', JSON.stringify(warehouseStock));
    } catch (error) {
        console.error('Error saving stock data:', error);
    }
}

loadStockData();

// Get all stock requests
export function getStockRequests(filters = {}) {
    try {
        let result = [...stockRequests];
        
        // Apply filters
        if (filters.branch && filters.branch !== 'all') {
            result = result.filter(r => r.requestingBranch === filters.branch);
        }
        
        if (filters.status && filters.status !== 'all') {
            result = result.filter(r => r.status === filters.status);
        }
        
        if (filters.requestType && filters.requestType !== 'all') {
            result = result.filter(r => r.requestType === filters.requestType);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            result = result.filter(r => 
                r.requestNumber?.toLowerCase().includes(search) ||
                r.requestingBranch?.toLowerCase().includes(search) ||
                r.requestedBy?.toLowerCase().includes(search)
            );
        }
        
        // Sort by date descending
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return { success: true, data: result, total: result.length };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Create new stock request
export function createStockRequest(requestData) {
    try {
        const requestNumber = generateRequestNumber();
        const newRequest = {
            id: 'REQ' + Date.now(),
            requestNumber: requestNumber,
            requestingBranch: requestData.branch,
            requestType: requestData.type, // 'internal' or 'sales_replenishment'
            priority: requestData.priority || 'normal',
            items: requestData.items || [],
            notes: requestData.notes || '',
            status: 'pending',
            requestedBy: requestData.requestedBy,
            requestedByRole: requestData.requestedByRole,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Approval workflow
            branchManagerApproval: {
                status: 'pending',
                approvedBy: null,
                approvedAt: null,
                notes: ''
            },
            warehouseManagerApproval: {
                status: 'pending',
                approvedBy: null,
                approvedAt: null,
                notes: ''
            },
            gmApproval: {
                status: 'pending',
                approvedBy: null,
                approvedAt: null,
                notes: ''
            },
            
            // Fulfillment tracking
            fulfilledAt: null,
            fulfilledBy: null,
            transferId: null,
            attachments: []
        };
        
        stockRequests.push(newRequest);
        saveStockData();
        
        return { success: true, data: newRequest };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Approve/reject stock request
export function approveStockRequest(requestId, approvalData) {
    try {
        const request = stockRequests.find(r => r.id === requestId);
        if (!request) {
            return { success: false, error: 'Request not found' };
        }
        
        const { approverRole, approvedBy, approved, notes } = approvalData;
        
        // Determine approval stage
        let currentStage = determineApprovalStage(request);
        
        if (currentStage === 'branch_manager') {
            request.branchManagerApproval = {
                status: approved ? 'approved' : 'rejected',
                approvedBy: approvedBy,
                approvedAt: new Date().toISOString(),
                notes: notes || ''
            };
        } else if (currentStage === 'warehouse_manager') {
            request.warehouseManagerApproval = {
                status: approved ? 'approved' : 'rejected',
                approvedBy: approvedBy,
                approvedAt: new Date().toISOString(),
                notes: notes || ''
            };
        } else if (currentStage === 'gm') {
            request.gmApproval = {
                status: approved ? 'approved' : 'rejected',
                approvedBy: approvedBy,
                approvedAt: new Date().toISOString(),
                notes: notes || ''
            };
        }
        
        // Update request status
        if (!approved) {
            request.status = 'rejected';
        } else if (requiresGMApproval(request) && !request.gmApproval.status !== 'approved') {
            request.status = 'pending_gm';
        } else if (requiresWarehouseApproval(request) && request.branchManagerApproval.status === 'approved') {
            request.status = 'pending_warehouse';
        } else {
            request.status = 'approved';
        }
        
        request.updatedAt = new Date().toISOString();
        saveStockData();
        
        return { success: true, data: request };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Determine current approval stage
function determineApprovalStage(request) {
    if (request.branchManagerApproval.status === 'pending') {
        return 'branch_manager';
    } else if (request.branchManagerApproval.status === 'approved' && request.warehouseManagerApproval.status === 'pending') {
        return 'warehouse_manager';
    } else if (requiresGMApproval(request) && request.gmApproval.status === 'pending') {
        return 'gm';
    }
    return 'ready';
}

// Check if request requires GM approval
function requiresGMApproval(request) {
    // Inter-branch transfers or special stock require GM approval
    return request.requestType === 'internal' || request.priority === 'urgent';
}

// Check if request requires warehouse manager approval
function requiresWarehouseApproval(request) {
    return request.requestType === 'sales_replenishment';
}

// Fulfill stock request
export function fulfillStockRequest(requestId, fulfillmentData) {
    try {
        const request = stockRequests.find(r => r.id === requestId);
        if (!request) {
            return { success: false, error: 'Request not found' };
        }
        
        if (request.status !== 'approved') {
            return { success: false, error: 'Request must be approved before fulfillment' };
        }
        
        // Create stock transfer
        const transfer = createStockTransfer(request, fulfillmentData);
        stockTransfers.push(transfer);
        
        // Mark request as fulfilled
        request.status = 'fulfilled';
        request.fulfilledAt = new Date().toISOString();
        request.fulfilledBy = fulfillmentData.fulfilledBy;
        request.transferId = transfer.id;
        request.updatedAt = new Date().toISOString();
        
        saveStockData();
        
        return { success: true, data: { request, transfer } };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Create stock transfer from request
function createStockTransfer(request, fulfillmentData) {
    const transfer = {
        id: 'TFR' + Date.now(),
        requestId: request.id,
        requestNumber: request.requestNumber,
        fromWarehouse: fulfillmentData.fromWarehouse,
        toBranch: request.requestingBranch,
        items: request.items,
        status: 'pending',
        driver: fulfillmentData.driver || '',
        vehicle: fulfillmentData.vehicle || '',
        dispatchNotes: fulfillmentData.dispatchNotes || '',
        createdAt: new Date().toISOString(),
        dispatchedAt: null,
        deliveredAt: null,
        receivedAt: null,
        dispatchedBy: fulfillmentData.dispatchedBy,
        receivedBy: null
    };
    
    return transfer;
}

// Get stock transfer by ID
export function getStockTransfers(filters = {}) {
    try {
        let result = [...stockTransfers];
        
        if (filters.status && filters.status !== 'all') {
            result = result.filter(t => t.status === filters.status);
        }
        
        if (filters.fromWarehouse && filters.fromWarehouse !== 'all') {
            result = result.filter(t => t.fromWarehouse === filters.fromWarehouse);
        }
        
        if (filters.toBranch && filters.toBranch !== 'all') {
            result = result.filter(t => t.toBranch === filters.toBranch);
        }
        
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return { success: true, data: result, total: result.length };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get warehouse stock levels
export function getWarehouseStock(warehouseId) {
    try {
        const stock = warehouseStock[warehouseId] || {};
        return { success: true, data: stock };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update warehouse stock
export function updateWarehouseStock(warehouseId, productId, quantity, movementType) {
    try {
        if (!warehouseStock[warehouseId]) {
            warehouseStock[warehouseId] = {};
        }
        
        if (!warehouseStock[warehouseId][productId]) {
            warehouseStock[warehouseId][productId] = {
                productId: productId,
                quantity: 0,
                reservedQuantity: 0,
                reorderLevel: 10,
                lastUpdated: new Date().toISOString(),
                history: []
            };
        }
        
        const stock = warehouseStock[warehouseId][productId];
        const previousQuantity = stock.quantity;
        
        if (movementType === 'in') {
            stock.quantity += quantity;
        } else if (movementType === 'out') {
            stock.quantity -= quantity;
        } else if (movementType === 'reserve') {
            stock.reservedQuantity += quantity;
        } else if (movementType === 'unreserve') {
            stock.reservedQuantity -= quantity;
        }
        
        stock.lastUpdated = new Date().toISOString();
        stock.history.push({
            type: movementType,
            quantity: quantity,
            previousQuantity: previousQuantity,
            newQuantity: stock.quantity,
            timestamp: new Date().toISOString(),
            recordedBy: 'system'
        });
        
        saveStockData();
        
        return { success: true, data: stock };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Generate request number
function generateRequestNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `SRQ-${year}${month}${day}-${random}`;
}

// Get stock statistics
export function getStockStatistics() {
    try {
        const stats = {
            totalActiveProducts: 0,
            totalStockValue: 0,
            lowStockProducts: 0,
            expiringProducts: 0,
            pendingTransfers: stockTransfers.filter(t => t.status === 'pending').length,
            pendingRequests: stockRequests.filter(r => r.status === 'pending').length
        };
        
        // Calculate from warehouse stock
        Object.keys(warehouseStock).forEach(warehouseId => {
            const warehouse = warehouseStock[warehouseId];
            Object.keys(warehouse).forEach(productId => {
                const stock = warehouse[productId];
                stats.totalActiveProducts++;
                
                // Get product details to calculate value
                // This would need product data integration
                
                if (stock.quantity <= stock.reorderLevel) {
                    stats.lowStockProducts++;
                }
            });
        });
        
        return { success: true, data: stats };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// CommonJS support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStockRequests,
        createStockRequest,
        approveStockRequest,
        fulfillStockRequest,
        getStockTransfers,
        getWarehouseStock,
        updateWarehouseStock,
        getStockStatistics
    };
}

