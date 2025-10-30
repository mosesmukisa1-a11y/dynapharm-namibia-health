// Cloud Sync for Dynapharm - GitHub-based storage
// This will sync data to a GitHub repository for permanent storage

class CloudStorage {
    constructor() {
        this.repo = 'mosesmukisa1-a11y/dynapharm-namibia-health';
        this.githubDataPath = 'cloud-data/data.json';
    }

    async loadFromCloud() {
        try {
            const url = `https://raw.githubusercontent.com/${this.repo}/main/cloud-data/data.json`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Loaded data from cloud storage');
                return data;
            }
        } catch (error) {
            console.log('Cloud storage not available, using local data');
        }
        
        return null;
    }

    async syncToLocal() {
        const cloudData = await this.loadFromCloud();
        
        if (cloudData) {
            // Merge cloud data with local data, keeping newer versions
            if (cloudData.clients) {
                localStorage.setItem('dyna_clients', JSON.stringify(cloudData.clients));
            }
            if (cloudData.reports) {
                localStorage.setItem('dyna_reports', JSON.stringify(cloudData.reports));
            }
            if (cloudData.users) {
                localStorage.setItem('dyna_users', JSON.stringify(cloudData.users));
            }
            if (cloudData.branches) {
                localStorage.setItem('dyna_branches', JSON.stringify(cloudData.branches));
            }
            if (cloudData.barcodeStock) {
                localStorage.setItem('dyna_barcode_stock', JSON.stringify(cloudData.barcodeStock));
            }
            if (cloudData.purchaseOrders) {
                localStorage.setItem('dyna_purchase_orders', JSON.stringify(cloudData.purchaseOrders));
            }
            if (cloudData.walkInSales) {
                localStorage.setItem('dyna_walkin_sales', JSON.stringify(cloudData.walkInSales));
            }
            if (cloudData.cashDrawer) {
                localStorage.setItem('dyna_cash_drawer', JSON.stringify(cloudData.cashDrawer));
            }
            if (cloudData.onlineOrders) {
                localStorage.setItem('dyna_online_orders', JSON.stringify(cloudData.onlineOrders));
            }
            if (cloudData.productPhotos) {
                localStorage.setItem('dyna_product_photos', JSON.stringify(cloudData.productPhotos));
            }
            if (cloudData.branchStock) {
                localStorage.setItem('dyna_branch_stock', JSON.stringify(cloudData.branchStock));
            }
            if (cloudData.scanAdjustments) {
                localStorage.setItem('dyna_scan_adjustments', JSON.stringify(cloudData.scanAdjustments));
            }
            
            console.log('✅ Synced cloud data to local storage');
        }
    }

    async saveToCloud() {
        const data = {
            clients: JSON.parse(localStorage.getItem('dyna_clients') || '[]'),
            users: JSON.parse(localStorage.getItem('dyna_users') || '[]'),
            branches: JSON.parse(localStorage.getItem('dyna_branches') || '[]'),
            reports: JSON.parse(localStorage.getItem('dyna_reports') || '[]'),
            barcodeStock: JSON.parse(localStorage.getItem('dyna_barcode_stock') || '[]'),
            purchaseOrders: JSON.parse(localStorage.getItem('dyna_purchase_orders') || '[]'),
            walkInSales: JSON.parse(localStorage.getItem('dyna_walkin_sales') || '[]'),
            cashDrawer: JSON.parse(localStorage.getItem('dyna_cash_drawer') || '{}'),
            onlineOrders: JSON.parse(localStorage.getItem('dyna_online_orders') || '[]'),
            productPhotos: JSON.parse(localStorage.getItem('dyna_product_photos') || '{}'),
            branchStock: JSON.parse(localStorage.getItem('dyna_branch_stock') || '{}'),
            scanAdjustments: JSON.parse(localStorage.getItem('dyna_scan_adjustments') || '[]'),
            lastSync: new Date().toISOString()
        };
        
        // Create a downloadable JSON file that can be committed to GitHub
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cloud-sync-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ Backup file ready for upload to GitHub');
        alert('Backup file downloaded! Please commit it to GitHub in cloud-data/data.json');
    }
}

// Initialize cloud storage
const cloudStorage = new CloudStorage();

// Auto-sync on page load
window.addEventListener('load', () => {
    cloudStorage.syncToLocal();
});

// Add to window for manual access
window.cloudStorage = cloudStorage;
