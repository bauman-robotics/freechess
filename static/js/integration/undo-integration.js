// static/js/integration/undo-integration.js
// ============================================
// ИНТЕГРАЦИЯ UNDO С ОСНОВНЫМ ПРИЛОЖЕНИЕМ
// ============================================

(function() {
    'use strict';
    
    console.log('🔄 Загрузка интеграции Undo...');
    
    // Функция синхронизации
    function syncUndoWithGame() {
        // Проверяем, что undoManager существует
        if (typeof window.undoManager === 'undefined' || window.undoManager === null) {
            console.warn('⚠️ UndoManager не найден, пропускаем синхронизацию');
            return;
        }
        
        const roomId = document.getElementById('roomDisplay')?.textContent;
        if (roomId && roomId !== '—') {
            window.undoManager.setRoom(roomId);
            console.log(`✅ UndoManager синхронизирован с комнатой: ${roomId}`);
        }
        
        // Синхронизируем историю из глобальной переменной
        if (window.moveHistory && window.moveHistory.length > 0) {
            window.undoManager.syncFromGame(
                roomId,
                window.moveHistory,
                window.canUndo || window.moveHistory.length > 0
            );
            console.log('✅ UndoManager синхронизирован с историей:', window.moveHistory.length);
        } else {
            // Если истории нет, но она может быть на сервере - запрашиваем
            if (roomId && roomId !== '—' && window.socket) {
                console.log('📤 Запрос истории с сервера при инициализации undo');
                window.socket.emit('get_move_history', { room_id: roomId });
            }
        }
    }
    
    // Функция для безопасной синхронизации
    function safeSyncUndo() {
        try {
            // Проверяем, что undoManager существует перед вызовом
            if (window.undoManager && typeof window.undoManager.setRoom === 'function') {
                syncUndoWithGame();
            } else {
                console.log('⏳ UndoManager ещё не инициализирован, отложенная синхронизация...');
                setTimeout(safeSyncUndo, 200);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка при синхронизации Undo:', error);
        }
    }
    
    // Ждём загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM загружен, интеграция Undo...');
        
        // Проверяем, что undoManager существует
        if (typeof window.undoManager === 'undefined' && typeof initUndoManager === 'function') {
            if (window.socketManager) {
                window.undoManager = initUndoManager(window.socketManager);
            } else if (window.socket) {
                window.undoManager = initUndoManager(window.socket);
            }
        }
        
        // Синхронизируем с задержкой
        setTimeout(safeSyncUndo, 300);
        
        // Синхронизируем при изменении комнаты
        const observer = new MutationObserver(function() {
            const roomDisplay = document.getElementById('roomDisplay');
            if (roomDisplay && roomDisplay.textContent !== '—') {
                setTimeout(safeSyncUndo, 100);
            }
        });
        
        const roomDisplay = document.getElementById('roomDisplay');
        if (roomDisplay) {
            observer.observe(roomDisplay, { childList: true, characterData: true, subtree: true });
        }
        
        // Перехватываем socket события
        if (window.socket) {
            window.socket.on('joined', function() {
                setTimeout(safeSyncUndo, 150);
            });
            
            window.socket.on('board_update', function(data) {
                // Если есть move_history, синхронизируем
                if (data.move_history) {
                    console.log('📥 Обновление истории из board_update:', data.move_history.length);
                    if (window.undoManager) {
                        window.undoManager.syncFromGame(
                            window.currentRoom,
                            data.move_history,
                            data.can_undo || data.move_history.length > 0
                        );
                    }
                }
                setTimeout(safeSyncUndo, 100);
            });
            
            // Обработчик получения истории
            window.socket.on('move_history_response', function(data) {
                console.log('📥 Получена история с сервера в undo-integration:', data);
                if (data.move_history && window.undoManager) {
                    window.undoManager.syncFromGame(
                        window.currentRoom || data.room_id,
                        data.move_history,
                        data.move_history.length > 0
                    );
                }
            });
        }
        
        console.log('✅ Интеграция Undo завершена');
    });
    
    // Если DOM уже загружен
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }
    
})();