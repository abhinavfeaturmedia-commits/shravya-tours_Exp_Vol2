import { EventEmitter } from 'events';

/**
 * Lightweight in-memory EventBus for real-time application updates.
 * Used to broadcast live events (chat messages, new leads, bookings, attendance)
 * to connected Server-Sent Events (SSE) clients without requiring heavy external brokers.
 */
class AppEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(300);
    }

    emitNotification(payload) {
        this.emit('app-notification', {
            ...payload,
            timestamp: payload.timestamp || new Date().toISOString()
        });
    }

    emitChat(payload) {
        this.emit('app-chat', {
            ...payload,
            timestamp: payload.timestamp || new Date().toISOString()
        });
    }

    emitActivity(payload) {
        this.emit('app-activity', {
            ...payload,
            timestamp: payload.timestamp || new Date().toISOString()
        });
    }
}

export const eventBus = new AppEventBus();
