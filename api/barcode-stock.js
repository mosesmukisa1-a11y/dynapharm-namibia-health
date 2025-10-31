// Barcode Stock Management with FEFO Enforcement
// Manages barcode generation, batch tracking, and FEFO enforcement

let stockBatches = [];
let barcodeInventory = {};

// Initialize from localStorage
function loadBarcodeStockData() {
    try {
        const stored = localStorage.getItem('dyna_barcode_stock');
        const storedInv = localStorage.getItem('dyna_barcode_inventory');
        
        if (stored) stockBatches = JSON.parse(stored);
        if (storedInv) barcodeInventory = JSON.parse(storedInv);
    } catch (error) {
        console.error('Error loading barcode stock data:', error);
    }
}

function saveBarcodeStockData() {
    try {
        localStorage.setItem('dyna_barcode_stock', JSON.stringify(stockBatches));
        localStorage.setItem('dyna_barcode_inventory', JSON.stringify(barcodeInventory));
    } catch (error) {
        console.error('Error saving barcode stock data:', error);
    }
}

loadBarcodeStockData();

// Update central warehouse stock (dynamic import to avoid circular coupling)
async function updateCentralWarehouseStock(warehouseId, productKey, quantity, movementType) {
    try {
        if (!warehouseId || !productKey || !quantity || !movementType) return;
        const mod = await import('./stock-requests.js');
        if (mod && typeof mod.updateWarehouseStock === 'function') {
            mod.updateWarehouseStock(warehouseId, productKey, Number(quantity), movementType);
        }
    } catch (error) {
        console.error('Error updating central warehouse stock:', error);
    }
}

// Generate unique barcode for stock item
export function generateBarcode(batchNumber, cartonNumber, productDescription) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BC${timestamp}${random}`;
}

// Import stock with barcode generation
export function importStockWithBarcode(stockData) {
    try {
        const { cartonNo, description, batchNo, expiryDate, quantity, totalCtns } = stockData;
        const sourceWarehouseId = stockData.sourceWarehouseId || null; // optional
        const productId = stockData.productId || description; // fallback to description if no productId
        
        // Generate barcode
        const barcode = generateBarcode(batchNo, cartonNo, description);
        
        // Create batch record
        const batch = {
            id: 'BATCH' + Date.now(),
            barcode: barcode,
            cartonNo: cartonNo,
            description: description,
            batchNo: batchNo,
            expiryDate: expiryDate, // YYYY-MM format
            expiryTimestamp: new Date(expiryDate + '-01').getTime(),
            quantity: parseInt(quantity),
            totalCtns: parseInt(totalCtns),
            importDate: new Date().toISOString(),
            // Track logical location for visibility; default to provided warehouse or country_stock
            location: sourceWarehouseId || 'country_stock',
            status: 'available',
            dispatchedQuantity: 0,
            remainingQuantity: parseInt(quantity)
        };
        
        stockBatches.push(batch);
        
        // Add to inventory tracking
        if (!barcodeInventory[description]) {
            barcodeInventory[description] = {
                description: description,
                batches: []
            };
        }
        barcodeInventory[description].batches.push(batch.id);
        
        // Reflect import into central warehouse stock if sourceWarehouseId provided
        if (sourceWarehouseId) {
            // fire and forget; central stock is persisted by that module
            updateCentralWarehouseStock(sourceWarehouseId, productId, parseInt(quantity), 'in');
        }

        saveBarcodeStockData();
        
        return { success: true, data: batch };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get stock by barcode (for scanning)
export function getStockByBarcode(barcode) {
    try {
        const batch = stockBatches.find(b => b.barcode === barcode);
        if (!batch) {
            return { success: false, error: 'Barcode not found' };
        }
        return { success: true, data: batch };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get FEFO stock for a product (First Expired First Out)
export function getFEFOStock(productDescription, quantity = 1) {
    try {
        if (!barcodeInventory[productDescription]) {
            return { success: false, error: 'Product not found in inventory' };
        }
        
        // Get all available batches for this product
        const batchIds = barcodeInventory[productDescription].batches;
        const batches = stockBatches
            .filter(b => batchIds.includes(b.id))
            .filter(b => b.status === 'available' && b.remainingQuantity > 0)
            .sort((a, b) => a.expiryTimestamp - b.expiryTimestamp); // Sort by expiry date (FEFO)
        
        if (batches.length === 0) {
            return { success: false, error: 'No stock available' };
        }
        
        // Return batches in FEFO order
        return { success: true, data: batches };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Dispatch stock (scan barcode and deduct)
export function dispatchStockByBarcode(barcode, quantity, toBranch, options = {}) {
    try {
        const batch = stockBatches.find(b => b.barcode === barcode);
        
        if (!batch) {
            return { success: false, error: 'Barcode not found' };
        }

        // FEFO enforcement: ensure this batch is the earliest expiring available for this product
        try {
            const fefo = getFEFOStock(batch.description, quantity);
            const allowNonFEFO = options && options.allowNonFEFO === true;
            if (fefo && fefo.success && Array.isArray(fefo.data) && fefo.data.length > 0 && !allowNonFEFO) {
                const earliest = fefo.data[0];
                if (typeof batch.expiryTimestamp === 'number' && typeof earliest.expiryTimestamp === 'number') {
                    if (batch.expiryTimestamp > earliest.expiryTimestamp) {
                        return { success: false, error: `FEFO violation: use earlier batch ${earliest.batchNo} (barcode ${earliest.barcode}) expiring first` };
                    }
                }
            }
        } catch (_) {}
        
        if (batch.remainingQuantity < quantity) {
            return { success: false, error: 'Insufficient stock. Available: ' + batch.remainingQuantity };
        }
        
        // Update batch
        batch.dispatchedQuantity += quantity;
        batch.remainingQuantity -= quantity;
        
        if (batch.remainingQuantity === 0) {
            batch.status = 'exhausted';
        }
        
        // Create dispatch record
        const dispatch = {
            id: 'DSP' + Date.now(),
            barcode: barcode,
            batchNo: batch.batchNo,
            description: batch.description,
            quantity: quantity,
            toBranch: toBranch,
            dispatchDate: new Date().toISOString(),
            dispatchedBy: currentUser ? currentUser.fullName : 'Unknown'
        };
        
        batch.dispatches = batch.dispatches || [];
        batch.dispatches.push(dispatch);
        
        // Attempt to reflect movement in central warehouse stock
        const productKey = options.productId || batch.description;
        const fromWarehouseId = options.fromWarehouseId || batch.location;
        if (fromWarehouseId) {
            updateCentralWarehouseStock(fromWarehouseId, productKey, Number(quantity), 'out');
        }
        if (toBranch) {
            updateCentralWarehouseStock(toBranch, productKey, Number(quantity), 'in');
            // Update batch logical location to destination for visibility
            batch.location = toBranch;
        }

        saveBarcodeStockData();
        
        return { success: true, data: { batch, dispatch } };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get stock list for distribution (FEFO sorted)
export function getDistributableStock(filters = {}) {
    try {
        let batches = [...stockBatches]
            .filter(b => b.location === 'country_stock' && b.status === 'available')
            .sort((a, b) => a.expiryTimestamp - b.expiryTimestamp); // FEFO
        
        if (filters.product) {
            batches = batches.filter(b => 
                b.description.toLowerCase().includes(filters.product.toLowerCase())
            );
        }
        
        if (filters.expiringWithinDays) {
            const days = parseInt(filters.expiringWithinDays);
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + days);
            
            batches = batches.filter(b => {
                const expiryDate = new Date(b.expiryDate + '-01');
                return expiryDate <= thresholdDate;
            });
        }
        
        return { success: true, data: batches, total: batches.length };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Scan barcode and get product info
export function scanBarcodeForSale(barcode) {
    try {
        const batch = stockBatches.find(b => b.barcode === barcode);
        
        if (!batch) {
            return { success: false, error: 'Barcode not found' };
        }
        
        // Get product price
        const product = PRICE_LIST.find(p => 
            p.description.toLowerCase() === batch.description.toLowerCase()
        );
        
        if (!product) {
            return { success: false, error: 'Product not in price list' };
        }
        
        // Check if stock is available and not expired
        const expiryDate = new Date(batch.expiryDate + '-01');
        const isExpired = expiryDate < new Date();
        
        if (isExpired) {
            return { success: false, error: 'Product has expired' };
        }
        
        // FEFO enforcement: cannot scan a later-expiring batch if an earlier one is available
        try {
            const fefo = getFEFOStock(batch.description, 1);
            if (fefo && fefo.success && Array.isArray(fefo.data) && fefo.data.length > 0) {
                const earliest = fefo.data[0];
                if (typeof batch.expiryTimestamp === 'number' && typeof earliest.expiryTimestamp === 'number') {
                    if (batch.expiryTimestamp > earliest.expiryTimestamp) {
                        return { success: false, error: `FEFO violation: scan batch ${earliest.batchNo} (barcode ${earliest.barcode}) which expires earlier` };
                    }
                }
            }
        } catch (_) {}

        if (batch.remainingQuantity <= 0) {
            return { success: false, error: 'Stock exhausted' };
        }
        
        return {
            success: true,
            data: {
                batch: batch,
                product: {
                    name: batch.description,
                    dp: product.dp,
                    cp: product.cp,
                    bv: product.bv,
                    availableQuantity: batch.remainingQuantity,
                    expiryDate: batch.expiryDate,
                    batchNo: batch.batchNo
                }
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sell stock by barcode (POS integration)
export function sellStockByBarcode(barcode, quantity, buyerType, branch) {
    try {
        const batch = stockBatches.find(b => b.barcode === barcode);
        
        if (!batch) {
            return { success: false, error: 'Barcode not found' };
        }

        // FEFO enforcement: ensure selling from earliest-expiring batch
        try {
            const fefo = getFEFOStock(batch.description, quantity);
            if (fefo && fefo.success && Array.isArray(fefo.data) && fefo.data.length > 0) {
                const earliest = fefo.data[0];
                if (typeof batch.expiryTimestamp === 'number' && typeof earliest.expiryTimestamp === 'number') {
                    if (batch.expiryTimestamp > earliest.expiryTimestamp) {
                        return { success: false, error: `FEFO violation: sell from batch ${earliest.batchNo} (barcode ${earliest.barcode}) which expires earlier` };
                    }
                }
            }
        } catch (_) {}
        
        if (batch.remainingQuantity < quantity) {
            return { success: false, error: 'Insufficient stock' };
        }
        
        // Get product price
        const product = PRICE_LIST.find(p => 
            p.description.toLowerCase() === batch.description.toLowerCase()
        );
        
        if (!product) {
            return { success: false, error: 'Product not in price list' };
        }
        
        // Calculate price based on buyer type
        const unitPrice = buyerType === 'distributor' ? product.dp : product.cp;
        const totalPrice = unitPrice * quantity;
        const totalBV = product.bv * quantity;
        
        // Deduct from stock
        batch.remainingQuantity -= quantity;
        batch.soldQuantity = (batch.soldQuantity || 0) + quantity;
        
        if (batch.remainingQuantity === 0) {
            batch.status = 'exhausted';
        }
        
        saveBarcodeStockData();
        
        // Create sale record
        const sale = {
            id: 'SL' + Date.now(),
            barcode: barcode,
            batchNo: batch.batchNo,
            product: batch.description,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            bv: totalBV,
            buyerType: buyerType,
            branch: branch,
            soldBy: currentUser ? currentUser.fullName : 'Unknown',
            saleDate: new Date().toISOString()
        };
        
        return { success: true, data: sale };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get stock statistics with FEFO warnings
export function getBarcodeStockStatistics() {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const totalProducts = Object.keys(barcodeInventory).length;
        let totalStockValue = 0;
        let expiringBatches = 0;
        let lowStockProducts = 0;
        
        Object.keys(barcodeInventory).forEach(product => {
            const batches = barcodeInventory[product].batches
                .map(id => stockBatches.find(b => b.id === id))
                .filter(b => b.status === 'available');
            
            // Count expiring batches
            batches.forEach(batch => {
                const expiryDate = new Date(batch.expiryDate + '-01');
                if (expiryDate <= thirtyDaysFromNow && expiryDate > now) {
                    expiringBatches++;
                }
            });
            
            // Calculate total quantity
            const totalQty = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
            
            // Get product price
            const productPrice = PRICE_LIST.find(p => 
                p.description.toLowerCase() === product.toLowerCase()
            );
            
            if (productPrice) {
                totalStockValue += totalQty * productPrice.cp;
            }
            
            // Check if low stock (less than 10 units)
            if (totalQty < 10) {
                lowStockProducts++;
            }
        });
        
        return {
            success: true,
            data: {
                totalProducts,
                totalStockValue: totalStockValue.toFixed(2),
                expiringBatches,
                lowStockProducts,
                totalBatches: stockBatches.length
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// CommonJS support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        importStockWithBarcode,
        getStockByBarcode,
        getFEFOStock,
        dispatchStockByBarcode,
        getDistributableStock,
        scanBarcodeForSale,
        sellStockByBarcode,
        getBarcodeStockStatistics,
        generateBarcode
    };
}

