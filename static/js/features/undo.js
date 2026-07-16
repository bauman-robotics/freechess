// ============================================
// МОДУЛЬ УПРАВЛЕНИЯ ОТМЕНОЙ ХОДОВ (UNDO)
// ============================================

class UndoManager {
    constructor(socketManager) {
        this.socket = socketManager;
        this.history = [];
        this.canUndo = false;
        this.currentRoom = null;
        this.isProcessing = false;
        this.listeners = {};
        
        this.undoMove = this.undoMove.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.clearHistory = this.clearHistory.bind(this);
        this.setRoom = this.setRoom.bind(this);
        this.syncFromGame = this.syncFromGame.bind(this);
        
        this.init();
    }
    
    init() {
        this.setupSocketEvents();
        this.updateUI();
        console.log('↩️ Система отмены ходов инициализирована');
    }
    
    syncFromGame(roomId, historyArray, canUndoState) {
        console.log('🔄 Синхронизация undoManager с игрой...');
        this.currentRoom = roomId;
        this.history = historyArray.map(function(move) {
            return {
                move: typeof move === 'string' ? move : (move.move || move),
                timestamp: Date.now()
            };
        });
        this.canUndo = canUndoState !== undefined ? canUndoState : this.history.length > 0;
        this.isProcessing = false;
        this.updateUI();
        
        // Синхронизируем с глобальным moveHistory
        if (typeof window !== 'undefined') {
            window.moveHistory = this.history.map(function(h) { return h.move; });
            window.canUndo = this.canUndo;
            console.log('✅ Глобальная история синхронизирована, длина:', window.moveHistory.length);
        }
        
        console.log('✅ UndoManager синхронизирован');
    }
    
    undoMove() {
        console.log('↩️ undoMove вызван');
        
        if (this.isProcessing) {
            console.warn('⚠️ Уже выполняется операция отмены');
            if (typeof showToast === 'function') {
                showToast('⏳ Операция отмены уже выполняется...', 'info');
            }
            return null;
        }
        
        if (!this.canUndo || this.history.length === 0) {
            console.log('❌ Нет ходов для отмены');
            if (typeof showToast === 'function') {
                showToast('Нет ходов для отмены', 'info');
            }
            return null;
        }
        
        if (!this.currentRoom) {
            console.log('❌ Нет комнаты');
            if (typeof showToast === 'function') {
                showToast('⚠️ Сначала присоединитесь к игре', 'info');
            }
            return null;
        }
        
        this.isProcessing = true;
        console.log('📤 Отправка undo_move в комнату ' + this.currentRoom);
        this.socket.emit('undo_move', {
            room_id: this.currentRoom
        });
        
        var self = this;
        setTimeout(function() {
            if (self.isProcessing) {
                console.warn('⚠️ Таймаут операции отмены');
                self.isProcessing = false;
                self.updateUI();
            }
        }, 5000);
        
        // Оптимистичное обновление глобальной истории
        if (typeof window !== 'undefined' && window.moveHistory && window.moveHistory.length > 0) {
            window.moveHistory.pop();
            window.canUndo = this.canUndo;
        }
        
        return this.history[this.history.length - 1];
    }
    
    clearHistory() {
        this.history = [];
        this.canUndo = false;
        this.isProcessing = false;
        this.updateUI();
        this.notifyListeners('history_cleared');
        console.log('↩️ История ходов очищена');
        
        if (typeof window !== 'undefined') {
            window.moveHistory = [];
            window.canUndo = false;
        }
    }
    
    getHistory() {
        return this.history.slice();
    }
    
    getHistoryCount() {
        return this.history.length;
    }
    
    setRoom(roomId) {
        this.currentRoom = roomId;
        console.log('↩️ Комната установлена: ' + roomId);
        this.updateUI();
    }
    
    setupSocketEvents() {
        var self = this;
        
        this.socket.on('undo_success', function(data) {
            console.log('📥 Получен undo_success');
            self.isProcessing = false;
            if (self.history.length > 0) {
                self.history.pop();
                self.canUndo = self.history.length > 0;
                self.updateUI();
                
                // Синхронизируем глобальную историю
                if (typeof window !== 'undefined' && window.moveHistory && window.moveHistory.length > 0) {
                    window.moveHistory.pop();
                    window.canUndo = self.canUndo;
                    console.log('🔄 Глобальная история обновлена, длина:', window.moveHistory.length);
                }
                
                if (typeof showToast === 'function') {
                    showToast('↩️ Ход отменён', 'info');
                }
            }
            console.log('✅ Отмена завершена');
        });
        
        this.socket.on('undo_error', function(data) {
            console.log('📥 Получен undo_error');
            self.isProcessing = false;
            console.error('❌ Ошибка отмены:', data.message);
            if (typeof showToast === 'function') {
                showToast('❌ ' + data.message, 'error');
            }
            self.updateUI();
        });
        
        this.socket.on('board_update', function(data) {
            if (self.isProcessing) {
                console.log('🔄 Сброс isProcessing');
                self.isProcessing = false;
            }
            if (data.can_undo !== undefined) {
                self.canUndo = data.can_undo;
                self.updateUI();
            }
            if (data.undo) {
                self.isProcessing = false;
                self.updateUI();
            }
            if (data.reset || data.clear) {
                self.clearHistory();
            }
        });
    }
    
    updateUI() {
        var btn = document.getElementById('undoBtn');
        if (btn) {
            btn.disabled = !this.canUndo || this.isProcessing;
            btn.style.opacity = (this.canUndo && !this.isProcessing) ? '1' : '0.5';
            btn.title = this.canUndo ? 'Отменить последний ход' : 'Нет ходов для отмены';
            var badge = document.getElementById('undoBadge');
            if (badge) {
                badge.textContent = this.history.length;
                badge.style.display = this.history.length > 0 ? 'inline' : 'none';
            }
        }
        var undoCount = document.getElementById('undoCount');
        if (undoCount) {
            undoCount.textContent = this.history.length;
        }
        var historyCount = document.getElementById('historyCount');
        if (historyCount) {
            historyCount.textContent = this.history.length;
        }
    }
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(function(cb) { return cb !== callback; });
    }
    
    notifyListeners(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(function(callback) {
            try {
                callback(data);
            } catch (error) {
                console.error('❌ Ошибка в слушателе: ' + event, error);
            }
        });
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

var undoManager = null;

function initUndoManager(socketManager) {
    if (!undoManager) {
        undoManager = new UndoManager(socketManager);
        window.undoManager = undoManager;
        console.log('✅ UndoManager создан');
    }
    return undoManager;
}

window.getUndoManager = function() {
    return undoManager;
};

console.log('↩️ Модуль undo.js загружен');