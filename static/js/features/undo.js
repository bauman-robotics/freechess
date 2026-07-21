// static/js/features/undo.js

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
        console.log('   roomId:', roomId);
        console.log('   historyArray length:', historyArray?.length || 0);
        console.log('   canUndoState:', canUndoState);
        
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
            console.log('✅ canUndo:', this.canUndo);
        }
        
        // ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ UI
        if (typeof window.renderBoard === 'function') {
            setTimeout(function() {
                window.renderBoard();
            }, 50);
        }
        
        console.log('✅ UndoManager синхронизирован, ходов:', this.history.length);
    }
    
    undoMove() {
        console.log('↩️ undoMove вызван');
        console.log('   currentRoom:', this.currentRoom);
        console.log('   history.length:', this.history.length);
        console.log('   canUndo:', this.canUndo);
        console.log('   isProcessing:', this.isProcessing);
        console.log('   socket:', this.socket);
        console.log('   socket.connected:', this.socket?.connected);
        
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
        
        // Проверяем, что сокет существует
        if (!this.socket) {
            console.error('❌ Сокет не существует!');
            this.isProcessing = false;
            if (typeof showToast === 'function') {
                showToast('❌ Ошибка соединения', 'error');
            }
            return null;
        }
        
        // Отправляем событие
        const emitData = { room_id: this.currentRoom };
        console.log('📤 Данные для отправки:', emitData);
        
        try {
            this.socket.emit('undo_move', emitData);
            console.log('✅ undo_move отправлен');
        } catch (error) {
            console.error('❌ Ошибка отправки undo_move:', error);
            this.isProcessing = false;
            if (typeof showToast === 'function') {
                showToast('❌ Ошибка отправки запроса', 'error');
            }
            return null;
        }
        
        // Таймаут на случай, если сервер не ответит
        var self = this;
        setTimeout(function() {
            if (self.isProcessing) {
                console.warn('⚠️ Таймаут операции отмены');
                self.isProcessing = false;
                self.updateUI();
                
                if (typeof showToast === 'function') {
                    showToast('⚠️ Таймаут отмены хода', 'error');
                }
            }
        }, 5000);
        
        return this.history[this.history.length - 1];
    }
    
    setupSocketEvents() {
        var self = this;
        
        // Обработчик успешной отмены
        this.socket.on('undo_success', function(data) {
            console.log('📥 Получен undo_success:', data);
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
        
        // Обработчик ошибки отмены
        this.socket.on('undo_error', function(data) {
            console.log('📥 Получен undo_error:', data);
            self.isProcessing = false;
            console.error('❌ Ошибка отмены:', data.message);
            if (typeof showToast === 'function') {
                showToast('❌ ' + data.message, 'error');
            }
            self.updateUI();
        });

        // Добавляем обработчик для любых ошибок
        this.socket.on('error', function(data) {
            console.log('📥 Получена ошибка:', data);
            if (self.isProcessing) {
                self.isProcessing = false;
                self.updateUI();
            }
        });
        
        // ============================================
        // ⚡ СЛУШАЕМ board_update ДЛЯ СИНХРОНИЗАЦИИ
        // ============================================
        this.socket.on('board_update', function(data) {
            console.log('📥 board_update в undoManager:', {
                has_move: !!data.move,
                can_undo: data.can_undo,
                move_history_len: data.move_history?.length || 0,
                undo: !!data.undo,
                reset: !!data.reset,
                clear: !!data.clear
            });
            
            if (self.isProcessing) {
                console.log('🔄 Сброс isProcessing');
                self.isProcessing = false;
            }
            
            // ============================================
            // ⚡ ОБНОВЛЯЕМ ИСТОРИЮ ИЗ ДАННЫХ
            // ============================================
            if (data.move_history) {
                console.log('📜 Обновление истории из board_update, длина:', data.move_history.length);
                self.history = data.move_history.map(function(move) {
                    return {
                        move: typeof move === 'string' ? move : (move.move || move),
                        timestamp: Date.now()
                    };
                });
                
                // Синхронизируем глобальную историю
                if (typeof window !== 'undefined') {
                    window.moveHistory = data.move_history;
                    console.log('✅ Глобальная история обновлена, длина:', window.moveHistory.length);
                }
            }
            
            // Обновляем canUndo
            if (data.can_undo !== undefined) {
                self.canUndo = data.can_undo;
                console.log('🔄 canUndo обновлён:', self.canUndo);
            } else {
                // Если can_undo не пришёл, вычисляем по длине истории
                self.canUndo = self.history.length > 0;
            }
            
            // Если это отмена - удаляем последний ход из истории
            if (data.undo && self.history.length > 0) {
                self.history.pop();
                self.canUndo = self.history.length > 0;
                if (typeof window !== 'undefined' && window.moveHistory && window.moveHistory.length > 0) {
                    window.moveHistory.pop();
                    window.canUndo = self.canUndo;
                }
                console.log('↩️ Ход удалён из истории после отмены, осталось:', self.history.length);
            }
            
            // Если это сброс или очистка - очищаем историю
            if (data.reset || data.clear) {
                self.clearHistory();
                console.log('🔄 История очищена (reset/clear)');
            }
            
            // Обновляем UI
            self.updateUI();
            
            console.log('✅ UndoManager обновлён, ходов:', self.history.length, 'canUndo:', self.canUndo);
        });
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
    
    updateUI() {
        console.log('🔄 updateUI: history.length=', this.history.length, 'canUndo=', this.canUndo);
        
        // Обновляем кнопку отмены
        var btn = document.getElementById('undoBtn');
        if (btn) {
            btn.disabled = !this.canUndo || this.isProcessing;
            btn.style.opacity = (this.canUndo && !this.isProcessing) ? '1' : '0.5';
            btn.title = this.canUndo ? 'Отменить последний ход' : 'Нет ходов для отмены';
            
            // Обновляем бейдж
            var badge = document.getElementById('undoBadge');
            if (badge) {
                badge.textContent = this.history.length;
                badge.style.display = this.history.length > 0 ? 'inline' : 'none';
            }
        }
        
        // Обновляем счётчик ходов для отмены в сайдбаре
        var undoCount = document.getElementById('undoCount');
        if (undoCount) {
            undoCount.textContent = this.history.length;
            console.log('🔄 undoCount обновлён:', this.history.length);
        }
        
        // Обновляем счётчик истории
        var historyCount = document.getElementById('historyCount');
        if (historyCount) {
            historyCount.textContent = this.history.length;
        }
        
        // Также обновляем глобальные переменные
        if (typeof window !== 'undefined') {
            window.canUndo = this.canUndo;
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
var _undoManagerInitRunning = false;

function initUndoManager(socketManager) {
    if (_undoManagerInitRunning) {
        console.warn('⚠️ UndoManager уже инициализируется, пропускаем');
        return null;
    }
    
    if (undoManager) {
        console.log('✅ UndoManager уже существует');
        return undoManager;
    }
    
    if (!socketManager) {
        console.warn('⚠️ Сокет не передан для UndoManager');
        return null;
    }
    
    _undoManagerInitRunning = true;
    
    try {
        undoManager = new UndoManager(socketManager);
        window.undoManager = undoManager;
        console.log('✅ UndoManager создан');
        return undoManager;
    } catch (error) {
        console.error('❌ Ошибка создания UndoManager:', error);
        return null;
    } finally {
        _undoManagerInitRunning = false;
    }
}

window.initUndoManager = initUndoManager;

console.log('↩️ Модуль undo.js загружен');