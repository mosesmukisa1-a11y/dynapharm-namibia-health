/**
 * Offline Sync Queue Manager
 * Handles offline operations and syncs when connection is restored
 */

class OfflineSyncQueue {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'offline_queue';
        this.apiBaseUrl = options.apiBaseUrl || '/api';
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.onSyncCallback = options.onSyncCallback || null;
        this.onSyncErrorCallback = options.onSyncErrorCallback || null;
    }

    /**
     * Check if device is online
     */
    isOnline() {
        return navigator.onLine && !this.hasConnectionError();
    }

    /**
     * Check for connection errors (custom implementation)
     */
    hasConnectionError() {
        // You can enhance this to check actual API connectivity
        return false;
    }

    /**
     * Get all queued operations
     */
    getQueue() {
        try {
            const queueStr = localStorage.getItem(this.storageKey);
            return queueStr ? JSON.parse(queueStr) : [];
        } catch (error) {
            console.error('Error reading offline queue:', error);
            return [];
        }
    }

    /**
     * Save queue to localStorage
     */
    saveQueue(queue) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(queue));
        } catch (error) {
            console.error('Error saving offline queue:', error);
        }
    }

    /**
     * Add operation to queue
     */
    queueOperation(operation) {
        const queue = this.getQueue();
        
        // Generate ID if not present
        if (!operation.id) {
            operation.id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamp
        operation.queuedAt = new Date().toISOString();
        operation.retries = 0;
        
        queue.push(operation);
        this.saveQueue(queue);
        
        console.log(`📝 Queued operation: ${operation.action} ${operation.resource}`, operation);
        
        // Try to sync immediately if online
        if (this.isOnline()) {
            this.syncOperation(operation.id);
        }
        
        return operation.id;
    }

    /**
     * Remove operation from queue
     */
    removeOperation(operationId) {
        const queue = this.getQueue();
        const filtered = queue.filter(op => op.id !== operationId);
        this.saveQueue(filtered);
    }

    /**
     * Sync a single operation
     */
    async syncOperation(operationId) {
        const queue = this.getQueue();
        const operation = queue.find(op => op.id === operationId);
        
        if (!operation) {
            return { success: false, error: 'Operation not found in queue' };
        }

        if (!this.isOnline()) {
            return { success: false, error: 'Device is offline' };
        }

        try {
            const { resource, action, data, method = 'POST', url } = operation;
            
            // Determine API endpoint
            const endpoint = url || `${this.apiBaseUrl}/${resource}`;
            
            // Prepare request
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            // Add body for POST/PUT requests
            if (method === 'POST' || method === 'PUT') {
                requestOptions.body = JSON.stringify(data);
            }

            // Make API request
            const response = await fetch(endpoint, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Remove from queue on success
            this.removeOperation(operationId);
            
            console.log(`✅ Synced operation: ${operation.action} ${operation.resource}`);
            
            // Call success callback
            if (this.onSyncCallback) {
                this.onSyncCallback(operation, result);
            }
            
            return { success: true, result };
            
        } catch (error) {
            console.error(`❌ Failed to sync operation ${operationId}:`, error);
            
            // Increment retry count
            operation.retries = (operation.retries || 0) + 1;
            
            // Remove if max retries reached
            if (operation.retries >= this.maxRetries) {
                console.error(`❌ Max retries reached for operation ${operationId}, removing from queue`);
                this.removeOperation(operationId);
                
                // Call error callback
                if (this.onSyncErrorCallback) {
                    this.onSyncErrorCallback(operation, error);
                }
            } else {
                // Update queue with new retry count
                const queue = this.getQueue();
                const index = queue.findIndex(op => op.id === operationId);
                if (index > -1) {
                    queue[index] = operation;
                    this.saveQueue(queue);
                }
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync all queued operations
     */
    async syncAll() {
        if (!this.isOnline()) {
            console.log('📴 Device is offline, skipping sync');
            return { synced: 0, failed: 0, total: 0 };
        }

        const queue = this.getQueue();
        
        if (queue.length === 0) {
            console.log('✅ No operations to sync');
            return { synced: 0, failed: 0, total: 0 };
        }

        console.log(`🔄 Syncing ${queue.length} queued operations...`);
        
        let synced = 0;
        let failed = 0;

        // Sync operations sequentially to maintain order
        for (const operation of queue) {
            const result = await this.syncOperation(operation.id);
            if (result.success) {
                synced++;
            } else {
                failed++;
            }
            
            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
        
        return { synced, failed, total: queue.length };
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const queue = this.getQueue();
        return {
            total: queue.length,
            byResource: queue.reduce((acc, op) => {
                acc[op.resource] = (acc[op.resource] || 0) + 1;
                return acc;
            }, {}),
            oldest: queue.length > 0 ? queue[0].queuedAt : null,
            newest: queue.length > 0 ? queue[queue.length - 1].queuedAt : null,
        };
    }

    /**
     * Clear all queued operations
     */
    clear() {
        this.saveQueue([]);
        console.log('🗑️ Cleared offline queue');
    }
}

// Create global instance
window.OfflineSyncQueue = OfflineSyncQueue;
window.offlineSyncQueue = new OfflineSyncQueue({
    apiBaseUrl: '/api',
    onSyncCallback: (operation, result) => {
        console.log('✅ Operation synced:', operation, result);
    },
    onSyncErrorCallback: (operation, error) => {
        console.error('❌ Operation sync failed:', operation, error);
        // You can show a notification to the user here
    }
});

// Auto-sync when connection is restored
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('🌐 Connection restored, syncing queued operations...');
        window.offlineSyncQueue.syncAll();
    });

    window.addEventListener('offline', () => {
        console.log('📴 Connection lost, operations will be queued');
    });
}

export default OfflineSyncQueue;

