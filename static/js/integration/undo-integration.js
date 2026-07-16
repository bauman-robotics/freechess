// ============================================
// ИНТЕГРАЦИЯ UNDO С ОСНОВНЫМ ПРИЛОЖЕНИЕМ
// ============================================

(function() {
    'use strict';
    
    console.log('🔄 Загрузка интеграции Undo...');
    
    // Функция синхронизации
    function syncUndoWithGame() {
        if (typeof window.undoManager === 'undefined') {
            console.warn('⚠️ UndoManager не найден');
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
        
        // Синхронизируем
        setTimeout(syncUndoWithGame, 200);
        
        // Синхронизируем при изменении комнаты
        const observer = new MutationObserver(function() {
            const roomDisplay = document.getElementById('roomDisplay');
            if (roomDisplay && roomDisplay.textContent !== '—') {
                syncUndoWithGame();
            }
        });
        
        const roomDisplay = document.getElementById('roomDisplay');
        if (roomDisplay) {
            observer.observe(roomDisplay, { childList: true, characterData: true, subtree: true });
        }
        
        // Перехватываем socket события
        if (window.socket) {
            window.socket.on('joined', function() {
                setTimeout(syncUndoWithGame, 100);
            });
            
            window.socket.on('board_update', function(data) {
                if (data.move && !data.undo) {
                    setTimeout(syncUndoWithGame, 50);
                }
                if (data.undo || data.reset || data.clear) {
                    setTimeout(syncUndoWithGame, 50);
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
