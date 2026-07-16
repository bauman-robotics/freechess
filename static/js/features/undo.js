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
        
        // Привязка методов
        this.undoMove = this.undoMove.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.clearHistory = this.clearHistory.bind(this);
        this.addMove = this.addMove.bind(this);
        this.setRoom = this.setRoom.bind(this);
        this.syncFromGame = this.syncFromGame.bind(this);
        
        this.init();
    }
    
    init() {
        this.setupSocketEvents();
        this.updateUI();
        console.log('↩️ Система отмены ходов инициализирована');
    }
    
    // === СИНХРОНИЗАЦИЯ С ИГРОЙ ===
    syncFromGame(roomId, historyArray, canUndoState) {
        console.log('🔄 Синхронизация undoManager с игрой...');
        this.currentRoom = roomId;
        this.history = historyArray.map(move => ({
            move: typeof move === 'string' ? move : move.move || move,
            timestamp: Date.now()
        }));
        this.canUndo = canUndoState !== undefined ? canUndoState : this.history.length > 0;
        // Сбрасываем isProcessing при синхронизации
        this.isProcessing = false;
        this.updateUI();
        console.log(`✅ UndoManager синхронизирован: room=${this.currentRoom}, history=${this.history.length}, canUndo=${this.canUndo}`);
    }
    
    // === УПРАВЛЕНИЕ ИСТОРИЕЙ ===
    addMove(moveData, boardState) {
        this.history.push({
            ...moveData,
            boardState: boardState ? JSON.parse(JSON.stringify(boardState)) : null,
            timestamp: Date.now()
        });
        this.canUndo = this.history.length > 0;
        this.isProcessing = false; // Сбрасываем на всякий случай
        this.updateUI();
        this.notifyListeners('move_added', moveData);
        console.log(`↩️ Ход добавлен (${this.history.length} ходов)`);
    }
    
    undoMove() {
        console.log('↩️ undoMove вызван');
        console.log('  canUndo:', this.canUndo);
        console.log('  history:', this.history.length);
        console.log('  currentRoom:', this.currentRoom);
        console.log('  isProcessing:', this.isProcessing);
        
        if (this.isProcessing) {
            console.warn('⚠️ Уже выполняется операция отмены, игнорируем');
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
        console.log(`📤 Отправка undo_move в комнату ${this.currentRoom}`);
        this.socket.emit('undo_move', {
            room_id: this.currentRoom
        });
        
        // Таймаут на случай, если сервер не ответит
        setTimeout(() => {
            if (this.isProcessing) {
                console.warn('⚠️ Таймаут операции отмены, сбрасываем isProcessing');
                this.isProcessing = false;
                this.updateUI();
            }
        }, 5000);
        
        return this.history[this.history.length - 1];
    }
    
    clearHistory() {
        this.history = [];
        this.canUndo = false;
        this.isProcessing = false;
        this.updateUI();
        this.notifyListeners('history_cleared');
        console.log('↩️ История ходов очищена');
    }
    
    getHistory() {
        return [...this.history];
    }
    
    getHistoryCount() {
        return this.history.length;
    }
    
    setRoom(roomId) {
        this.currentRoom = roomId;
        console.log(`↩️ Комната установлена: ${roomId}`);
        this.updateUI();
    }
    
    // === SOCKET СОБЫТИЯ ===
    setupSocketEvents() {
        this.socket.on('undo_success', (data) => {
            console.log('📥 Получен undo_success');
            this.isProcessing = false;
            
            if (this.history.length > 0) {
                const removed = this.history.pop();
                this.canUndo = this.history.length > 0;
                this.updateUI();
                this.notifyListeners('undo_success', removed);
                
                // Обновляем глобальный moveHistory
                if (typeof window !== 'undefined' && window.moveHistory) {
                    if (window.moveHistory.length > 0) {
                        window.moveHistory.pop();
                    }
                }
                
                if (removed && typeof showToast === 'function') {
                    const pieceName = PIECE_NAMES?.[removed.piece] || removed.piece || 'Фигура';
                    showToast(`↩️ Отменён ход: ${pieceName}`, 'info');
                }
            }
            
            console.log(`✅ Отмена завершена, осталось ходов: ${this.history.length}`);
        });
        
        this.socket.on('undo_error', (data) => {
            console.log('📥 Получен undo_error');
            this.isProcessing = false;
            console.error('❌ Ошибка отмены:', data.message);
            if (typeof showToast === 'function') {
                showToast(`❌ ${data.message}`, 'error');
            }
            this.updateUI();
        });
        
        this.socket.on('board_update', (data) => {
            // Сбрасываем isProcessing при любом обновлении доски
            if (this.isProcessing) {
                console.log('🔄 Сброс isProcessing после board_update');
                this.isProcessing = false;
            }
            
            if (data.can_undo !== undefined) {
                this.canUndo = data.can_undo;
                this.updateUI();
            }
            
            if (data.undo) {
                this.updateUI();
                // Убеждаемся, что isProcessing сброшен
                this.isProcessing = false;
            }
            
            if (data.reset || data.clear) {
                this.clearHistory();
                if (typeof window !== 'undefined' && window.moveHistory) {
                    window.moveHistory = [];
                }
            }
        });
    }
    
    // === UI ОБНОВЛЕНИЯ ===
    updateUI() {
        const btn = document.getElementById('undoBtn');
        if (btn) {
            btn.disabled = !this.canUndo || this.isProcessing;
            btn.style.opacity = (this.canUndo && !this.isProcessing) ? '1' : '0.5';
            btn.title = this.isProcessing ? '⏳ Отмена выполняется...' : 
                       (this.canUndo ? `Отменить последний ход (${this.history.length})` : 'Нет ходов для отмены');
            
            const badge = document.getElementById('undoBadge');
            if (badge) {
                badge.textContent = this.history.length;
                badge.style.display = this.history.length > 0 ? 'inline' : 'none';
            }
        }
        
        const undoCount = document.getElementById('undoCount');
        if (undoCount) {
            undoCount.textContent = this.history.length;
        }
        
        const historyCount = document.getElementById('historyCount');
        if (historyCount) {
            historyCount.textContent = this.history.length;
        }
        
        this.updateHistoryDisplay();
    }
    
    updateHistoryDisplay() {
        const historyEl = document.getElementById('moveHistory');
        if (!historyEl) return;
        
        if (this.history.length === 0) {
            historyEl.innerHTML = '<div style="color: #666; text-align: center; padding: 8px; font-size: 12px;">История пуста</div>';
            return;
        }
        
        const displayHistory = this.history.slice(-50);
        let html = '';
        let moveNumber = 1;
        
        for (let i = 0; i < displayHistory.length; i += 2) {
            const whiteMove = displayHistory[i];
            const blackMove = displayHistory[i + 1];
            
            html += `<div class="move-item">`;
            html += `<span class="move-number">${moveNumber}.</span>`;
            
            if (whiteMove) {
                const moveText = typeof whiteMove === 'string' ? whiteMove : 
                    (whiteMove.move || whiteMove.piece || 'Ход');
                html += `<span class="move-text white-move">${moveText}</span>`;
            }
            
            if (blackMove) {
                const moveText = typeof blackMove === 'string' ? blackMove : 
                    (blackMove.move || blackMove.piece || 'Ход');
                html += `<span class="move-text black-move">${moveText}</span>`;
            }
            
            html += `</div>`;
            moveNumber++;
        }
        
        historyEl.innerHTML = html;
        historyEl.scrollTop = historyEl.scrollHeight;
    }
    
    // === СИСТЕМА СОБЫТИЙ ===
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    
    notifyListeners(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Ошибка в слушателе "${event}":`, error);
            }
        });
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

let undoManager = null;

function initUndoManager(socketManager) {
    if (!undoManager) {
        undoManager = new UndoManager(socketManager);
        window.undoManager = undoManager;
        console.log('✅ UndoManager создан');
    }
    return undoManager;
}

// Глобальная функция для доступа
window.getUndoManager = function() {
    return undoManager;
};

// Экспорт для модульной системы
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UndoManager, initUndoManager, undoManager };
}

console.log('↩️ Модуль undo.js загружен');
