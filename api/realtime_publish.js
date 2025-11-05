/**
 * Realtime Event Publishing Helper
 * Publishes database changes to the realtime gateway for WebSocket broadcasting
 */

// Get realtime gateway URL from environment or use default
const REALTIME_GATEWAY_URL = 
    (typeof process !== 'undefined' && process.env?.REALTIME_GATEWAY_URL) 
    || 'http://localhost:8080';

/**
 * Publish a real-time event to notify all connected clients
 */
export async function publishRealtimeEvent(resource, action, data, branchId = null) {
    try {
        const event = {
            type: `${resource}:${action}`,
            resource,
            action,
            data,
            branchId,
            timestamp: Date.now(),
        };

        const response = await fetch(`${REALTIME_GATEWAY_URL}/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ event }),
        });

        if (!response.ok) {
            console.warn(`Failed to publish realtime event: ${response.statusText}`);
        }

        return { success: response.ok };
    } catch (error) {
        // Don't fail the main operation if realtime publish fails
        console.error('Error publishing realtime event:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Publish multiple events in batch
 */
export async function publishBatchEvents(events) {
    try {
        const response = await fetch(`${REALTIME_GATEWAY_URL}/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ events }),
        });

        return { success: response.ok };
    } catch (error) {
        console.error('Error publishing batch events:', error);
        return { success: false, error: error.message };
    }
}
