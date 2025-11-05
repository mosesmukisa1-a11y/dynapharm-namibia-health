/**
 * Real-Time WebSocket Client for Dynapharm
 * Handles WebSocket connections, subscriptions, and real-time updates
 */

class RealtimeClient {
    constructor(options = {}) {
        this.wsUrl = options.wsUrl || 'ws://localhost:8080/ws';
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || Infinity;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.subscriptions = new Set();
        this.eventHandlers = new Map();
        this.isConnected = false;
        this.pingInterval = null;
        this.onConnectCallbacks = [];
        this.onDisconnectCallbacks = [];
        this.onErrorCallbacks = [];
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('✅ Already connected');
            return;
        }

        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log('✅ Connected to realtime gateway');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Restore subscriptions
                if (this.subscriptions.size > 0) {
                    this.subscribe(Array.from(this.subscriptions));
                }

                // Start ping interval
                this.startPing();

                // Call connect callbacks
                this.onConnectCallbacks.forEach(cb => cb());
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.onErrorCallbacks.forEach(cb => cb(error));
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
                this.stopPing();
                
                // Call disconnect callbacks
                this.onDisconnectCallbacks.forEach(cb => cb());

                // Attempt to reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
                    setTimeout(() => this.connect(), delay);
                } else {
                    console.error('❌ Max reconnection attempts reached');
                }
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            setTimeout(() => this.connect(), this.reconnectDelay);
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(data) {
        // Handle server events
        if (data.type === 'hello') {
            console.log('👋 Server hello:', data.message);
        } else if (data.type === 'pong') {
            // Pong received, connection is alive
        } else if (data.type === 'subscribed') {
            console.log('📥 Subscribed to channels:', data.channels);
        } else if (data.type === 'unsubscribed') {
            console.log('📤 Unsubscribed from channels:', data.channels);
        } else if (data.type === 'event') {
            // Real-time data update
            this.handleEvent(data);
        }
    }

    /**
     * Handle real-time events
     */
    handleEvent(event) {
        const { resource, action, data, type } = event;
        
        // Call handlers for specific resource:action
        const key = `${resource}:${action}`;
        const handlers = this.eventHandlers.get(key) || [];
        handlers.forEach(handler => handler(data, event));

        // Call handlers for resource:*
        const resourceHandlers = this.eventHandlers.get(`${resource}:*`) || [];
        resourceHandlers.forEach(handler => handler(data, event));

        // Call general event handlers
        const generalHandlers = this.eventHandlers.get('*') || [];
        generalHandlers.forEach(handler => handler(data, event));
    }

    /**
     * Subscribe to channels (resources)
     */
    subscribe(channels) {
        const channelArray = Array.isArray(channels) ? channels : [channels];
        
        channelArray.forEach(channel => {
            if (channel) {
                this.subscriptions.add(channel);
            }
        });

        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channels: channelArray
            }));
        }
    }

    /**
     * Unsubscribe from channels
     */
    unsubscribe(channels) {
        const channelArray = Array.isArray(channels) ? channels : [channels];
        
        channelArray.forEach(channel => {
            this.subscriptions.delete(channel);
        });

        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                channels: channelArray
            }));
        }
    }

    /**
     * Register event handler
     */
    on(eventPattern, handler) {
        if (!this.eventHandlers.has(eventPattern)) {
            this.eventHandlers.set(eventPattern, []);
        }
        this.eventHandlers.get(eventPattern).push(handler);
    }

    /**
     * Remove event handler
     */
    off(eventPattern, handler) {
        const handlers = this.eventHandlers.get(eventPattern);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Register connection callback
     */
    onConnect(callback) {
        this.onConnectCallbacks.push(callback);
    }

    /**
     * Register disconnect callback
     */
    onDisconnect(callback) {
        this.onDisconnectCallbacks.push(callback);
    }

    /**
     * Register error callback
     */
    onError(callback) {
        this.onErrorCallbacks.push(callback);
    }

    /**
     * Start ping interval to keep connection alive
     */
    startPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.ws) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * Stop ping interval
     */
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

// Create global instance
window.RealtimeClient = RealtimeClient;
window.realtimeClient = new RealtimeClient({
    wsUrl: process.env.REALTIME_GATEWAY_WS_URL || 'ws://localhost:8080/ws'
});

// Auto-connect on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.realtimeClient.connect();
    });
}

export default RealtimeClient;

