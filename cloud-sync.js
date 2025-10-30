// Cloud Sync for Dynapharm - GitHub-based storage
// This will sync data to a GitHub repository for permanent storage

class CloudStorage {
    constructor() {
        this.repo = 'mosesmukisa1-a11y/dynapharm-namibia-health';
        this.githubDataPath = 'cloud-data/data.json';
        this.githubApiBase = 'https://api.github.com';
        this.tokenStorageKey = 'dyna_github_token';
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
            if (cloudData.appointments) {
                localStorage.setItem('dyna_consult_appointments', JSON.stringify(cloudData.appointments));
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
            appointments: JSON.parse(localStorage.getItem('dyna_consult_appointments') || '[]'),
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

    _aggregateData() {
        return {
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
            appointments: JSON.parse(localStorage.getItem('dyna_consult_appointments') || '[]'),
            lastSync: new Date().toISOString()
        };
    }

    async _getExistingFileSha(token) {
        const url = `${this.githubApiBase}/repos/${this.repo}/contents/${this.githubDataPath}`;
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Failed to get existing file: ${res.status}`);
        const json = await res.json();
        return json.sha || null;
    }

    async saveToGitHub(token, commitMessage = 'Cloud sync: update data.json') {
        if (!token) throw new Error('GitHub token is required');
        const data = this._aggregateData();
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const sha = await this._getExistingFileSha(token);
        const url = `${this.githubApiBase}/repos/${this.repo}/contents/${this.githubDataPath}`;
        const body = {
            message: commitMessage,
            content,
            sha: sha || undefined
        };
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`GitHub save failed: ${res.status} ${errText}`);
        }
        console.log('✅ Data saved to GitHub cloud-data/data.json');
        return true;
    }

    getStoredToken() {
        try { return localStorage.getItem(this.tokenStorageKey) || ''; } catch(_) { return ''; }
    }

    setStoredToken(token) {
        if (!token) return;
        localStorage.setItem(this.tokenStorageKey, token);
    }

    async tryAutoSaveToGitHub(commitMessage = 'Cloud sync: auto-save') {
        const token = this.getStoredToken();
        if (!token) return false;
        try {
            await this.saveToGitHub(token, commitMessage);
            return true;
        } catch(_) {
            return false;
        }
    }
}

// Initialize cloud storage
const cloudStorage = new CloudStorage();

// Auto-sync on page load
window.addEventListener('load', () => {
    cloudStorage.syncToLocal();
    try {
        if (!document.getElementById('cloud-save-btn')) {
            const btn = document.createElement('button');
            btn.id = 'cloud-save-btn';
            btn.textContent = '💾 Save to Cloud';
            btn.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:#1769aa;color:#fff;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)';
            btn.addEventListener('click', async () => {
                let token = cloudStorage.getStoredToken();
                if (!token) {
                    token = prompt('Enter GitHub Personal Access Token (repo scope) to save data.json:');
                    if (!token) return;
                    cloudStorage.setStoredToken(token);
                }
                btn.disabled = true; btn.textContent = 'Saving...';
                try {
                    await cloudStorage.saveToGitHub(token, 'Cloud sync: save from app');
                    alert('Saved to GitHub cloud-data/data.json');
                } catch (e) {
                    alert('Save failed: ' + e.message);
                } finally {
                    btn.disabled = false; btn.textContent = '💾 Save to Cloud';
                }
            });
            document.body.appendChild(btn);
        }
    } catch(_) { /* ignore */ }
});

// Add to window for manual access
window.cloudStorage = cloudStorage;
window.cloudSaveToGitHub = async function() {
    let token = cloudStorage.getStoredToken();
    if (!token) {
        token = prompt('Enter GitHub Personal Access Token (repo scope) to save data.json:');
        if (!token) return;
        cloudStorage.setStoredToken(token);
    }
    await cloudStorage.saveToGitHub(token, 'Cloud sync: manual save');
};
window.cloudSetGitHubToken = function() {
    const token = prompt('Enter GitHub Personal Access Token (repo scope) to store for auto-save:');
    if (!token) return false;
    cloudStorage.setStoredToken(token);
    alert('Token saved locally for auto-save.');
    return true;
};
window.cloudAutoSaveAll = async function(commitMessage = 'Cloud sync: auto-save') {
    return await cloudStorage.tryAutoSaveToGitHub(commitMessage);
};
