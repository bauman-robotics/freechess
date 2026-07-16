// static/js/core/socket.js

class SocketManager {
    constructor() {
        this.socket = io();
        this.isConnected = false;
        this.eventHandlers = new Map();
        this.setupListeners();
    }
    
    setupListeners() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('🔌 Подключено к серверу');
            this.emit('client_ready', { timestamp: Date.now() });
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('🔌 Отключено от сервера');
            if (typeof showToast === 'function') {
                showToast('🔌 Отключено от сервера', 'error');
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('❌ Ошибка подключения:', error);
            if (typeof showToast === 'function') {
                showToast('❌ Ошибка подключения к серверу', 'error');
            }
        });
    }
    
    emit(event, data) {
        if (!this.isConnected) {
            console.warn(`⚠️ Сокет не подключён, событие "${event}" не отправлено`);
            return false;
        }
        this.socket.emit(event, data);
        return true;
    }
    
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
        this.socket.on(event, callback);
    }
    
    off(event, callback) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
            if (handlers.length === 0) {
                this.eventHandlers.delete(event);
            }
        }
        this.socket.off(event, callback);
    }
    
    once(event, callback) {
        this.socket.once(event, callback);
    }
}

// Создаём глобальный экземпляр
const socketManager = new SocketManager();