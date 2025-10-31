// Products and Price Management API
// Manages products, pricing, and price list uploads

let products = [];
let priceHistory = [];
let priceListUploads = [];

// Initialize from localStorage if available
function loadProductsData() {
    try {
        const storedProducts = localStorage.getItem('dyna_products');
        const storedHistory = localStorage.getItem('dyna_price_history');
        const storedUploads = localStorage.getItem('dyna_price_list_uploads');
        
        if (storedProducts) products = JSON.parse(storedProducts);
        if (storedHistory) priceHistory = JSON.parse(storedHistory);
        if (storedUploads) priceListUploads = JSON.parse(storedUploads);
    } catch (error) {
        console.error('Error loading products data:', error);
    }
}

function saveProductsData() {
    try {
        localStorage.setItem('dyna_products', JSON.stringify(products));
        localStorage.setItem('dyna_price_history', JSON.stringify(priceHistory));
        localStorage.setItem('dyna_price_list_uploads', JSON.stringify(priceListUploads));
    } catch (error) {
        console.error('Error saving products data:', error);
    }
}

// Load data on initialization
loadProductsData();

// Get all products
export function getProducts(filters = {}) {
    try {
        let result = [...products];
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            result = result.filter(p => 
                p.sku?.toLowerCase().includes(search) ||
                p.name?.toLowerCase().includes(search) ||
                p.description?.toLowerCase().includes(search) ||
                p.category?.toLowerCase().includes(search)
            );
        }
        
        if (filters.category && filters.category !== 'all') {
            result = result.filter(p => p.category === filters.category);
        }
        
        if (filters.isActive !== undefined) {
            result = result.filter(p => p.isActive === filters.isActive);
        }
        
        return {
            success: true,
            data: result,
            total: result.length
        };
    } catch (error) {
        console.error('Error getting products:', error);
        return { success: false, error: error.message };
    }
}

// Get single product by ID
export function getProductById(id) {
    try {
        const product = products.find(p => p.id === id);
        return product ? { success: true, data: product } : { success: false, error: 'Product not found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Create or update product
export function saveProduct(productData) {
    try {
        if (!productData.name || !productData.dp || !productData.cp || !productData.bv) {
            return { success: false, error: 'Missing required fields (name, dp, cp, bv)' };
        }
        
        // Validate pricing
        if (parseFloat(productData.dp) > parseFloat(productData.cp)) {
            return { success: false, error: 'DP cannot be greater than CP' };
        }
        
        const existingIndex = products.findIndex(p => p.id === productData.id);
        
        if (existingIndex >= 0) {
            // Update existing product
            const oldProduct = { ...products[existingIndex] };
            products[existingIndex] = {
                ...productData,
                updatedAt: new Date().toISOString()
            };
            
            // Check if pricing changed
            if (oldProduct.dp !== productData.dp || oldProduct.cp !== productData.cp || oldProduct.bv !== productData.bv) {
                addPriceHistory(productData.id, oldProduct, productData);
            }
            
            saveProductsData();
            return { success: true, data: products[existingIndex], message: 'Product updated' };
        } else {
            // Create new product
            const newProduct = {
                id: productData.id || 'PRD' + Date.now(),
                sku: productData.sku || productData.name.toUpperCase().replace(/\s+/g, '-'),
                name: productData.name,
                description: productData.description || productData.name,
                category: productData.category || 'General',
                unit: productData.unit || 'Unit',
                dp: parseFloat(productData.dp),
                cp: parseFloat(productData.cp),
                bv: parseFloat(productData.bv),
                taxRate: parseFloat(productData.taxRate || 0),
                isActive: productData.isActive !== undefined ? productData.isActive : true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: productData.createdBy || 'system',
                branch: productData.branch || 'all'
            };
            
            products.push(newProduct);
            addPriceHistory(newProduct.id, null, newProduct);
            saveProductsData();
            
            return { success: true, data: newProduct, message: 'Product created' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Add price history entry
function addPriceHistory(productId, oldPrice, newPrice) {
    try {
        // Close previous price history if exists
        if (oldPrice) {
            const activeHistory = priceHistory.find(h => h.productId === productId && !h.effectiveTo);
            if (activeHistory) {
                activeHistory.effectiveTo = new Date().toISOString();
                activeHistory.updatedBy = newPrice.createdBy || 'system';
                activeHistory.updatedAt = new Date().toISOString();
            }
        }
        
        // Create new price history entry
        const historyEntry = {
            id: 'PH' + Date.now(),
            productId: productId,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
            dp: parseFloat(newPrice.dp),
            cp: parseFloat(newPrice.cp),
            bv: parseFloat(newPrice.bv),
            changedBy: newPrice.createdBy || 'system',
            changedAt: new Date().toISOString()
        };
        
        priceHistory.push(historyEntry);
        saveProductsData();
    } catch (error) {
        console.error('Error adding price history:', error);
    }
}

// Get price history for a product
export function getPriceHistory(productId) {
    try {
        const history = priceHistory
            .filter(h => h.productId === productId)
            .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));
        return { success: true, data: history };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Upload price list (CSV/XLSX data)
export function uploadPriceList(fileData, uploadedBy = 'system', notes = '') {
    try {
        const rows = parsePriceListFile(fileData);
        const preview = generatePreview(rows);
        
        return {
            success: true,
            data: {
                preview: preview,
                summary: {
                    total: rows.length,
                    new: preview.new.length,
                    updated: preview.updated.length,
                    unchanged: preview.unchanged.length,
                    errors: preview.errors.length
                }
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Apply price list upload
export function applyPriceListUpload(uploadData, uploadedBy = 'system') {
    try {
        const rows = uploadData.preview.new.concat(uploadData.preview.updated);
        let rowsAdded = 0;
        let rowsUpdated = 0;
        
        rows.forEach(row => {
            const existing = products.find(p => 
                p.sku === row.sku || 
                p.name.toLowerCase() === row.name.toLowerCase()
            );
            
            if (existing) {
                // Update existing
                const oldProduct = { ...existing };
                existing.name = row.name;
                existing.description = row.description || row.name;
                existing.category = row.category || existing.category;
                existing.dp = parseFloat(row.dp);
                existing.cp = parseFloat(row.cp);
                existing.bv = parseFloat(row.bv);
                existing.updatedAt = new Date().toISOString();
                
                if (oldProduct.dp !== existing.dp || oldProduct.cp !== existing.cp || oldProduct.bv !== existing.bv) {
                    addPriceHistory(existing.id, oldProduct, existing);
                }
                
                rowsUpdated++;
            } else {
                // Add new
                const newProduct = {
                    id: 'PRD' + Date.now() + Math.random().toString(36).substr(2, 9),
                    sku: row.sku || row.name.toUpperCase().replace(/\s+/g, '-'),
                    name: row.name,
                    description: row.description || row.name,
                    category: row.category || 'General',
                    unit: row.unit || 'Unit',
                    dp: parseFloat(row.dp),
                    cp: parseFloat(row.cp),
                    bv: parseFloat(row.bv),
                    taxRate: 0,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: uploadedBy,
                    branch: 'all'
                };
                
                products.push(newProduct);
                addPriceHistory(newProduct.id, null, newProduct);
                rowsAdded++;
            }
        });
        
        // Record upload
        const upload = {
            id: 'UPL' + Date.now(),
            period: uploadData.period || new Date().toISOString().substring(0, 7),
            rowsAdded: rowsAdded,
            rowsUpdated: rowsUpdated,
            uploadedBy: uploadedBy,
            uploadedAt: new Date().toISOString(),
            notes: uploadData.notes || ''
        };
        
        priceListUploads.push(upload);
        saveProductsData();
        
        return {
            success: true,
            data: {
                rowsAdded,
                rowsUpdated,
                uploadId: upload.id
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Parse CSV/XLSX file data
function parsePriceListFile(fileData) {
    // Expects fileData to be array of objects with {name, dp, cp, bv, [sku], [category]}
    // This will be handled by the frontend file reader
    return fileData;
}

// Generate preview of changes
function generatePreview(rows) {
    const newProducts = [];
    const updated = [];
    const unchanged = [];
    const errors = [];
    
    rows.forEach(row => {
        // Validate row
        if (!row.name || !row.dp || !row.cp || !row.bv) {
            errors.push({ row, error: 'Missing required fields' });
            return;
        }
        
        const dp = parseFloat(row.dp);
        const cp = parseFloat(row.cp);
        const bv = parseFloat(row.bv);
        
        if (isNaN(dp) || isNaN(cp) || isNaN(bv)) {
            errors.push({ row, error: 'Invalid numeric values' });
            return;
        }
        
        if (dp > cp) {
            errors.push({ row, error: 'DP cannot be greater than CP' });
            return;
        }
        
        const existing = products.find(p => 
            p.sku === row.sku || 
            (p.name.toLowerCase() === row.name.toLowerCase())
        );
        
        if (existing) {
            const changed = existing.dp !== dp || existing.cp !== cp || existing.bv !== bv;
            if (changed) {
                updated.push({
                    existing,
                    new: {
                        name: row.name,
                        sku: row.sku || existing.sku,
                        description: row.description || row.name,
                        category: row.category || existing.category,
                        dp,
                        cp,
                        bv
                    }
                });
            } else {
                unchanged.push(existing);
            }
        } else {
            newProducts.push({
                name: row.name,
                sku: row.sku || row.name.toUpperCase().replace(/\s+/g, '-'),
                description: row.description || row.name,
                category: row.category || 'General',
                dp,
                cp,
                bv
            });
        }
    });
    
    return { new: newProducts, updated, unchanged, errors };
}

// CommonJS support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getProducts,
        getProductById,
        saveProduct,
        getPriceHistory,
        uploadPriceList,
        applyPriceListUpload
    };
}


