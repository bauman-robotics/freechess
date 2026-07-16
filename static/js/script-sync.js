// ============================================
// СИНХРОНИЗАЦИЯ ПОДСВЕТКИ ХОДОВ
// ============================================

// Функция синхронизации подсветки
function syncMoveHighlightFromGame(data) {
    if (typeof window.moveHighlight === 'undefined') {
        console.warn('⚠️ MoveHighlight не найден');
        return;
    }
    
    // Если есть move в данных - обновляем подсветку
    if (data && data.move) {
        console.log('🔄 Обновление подсветки из данных:', data.move);
        window.moveHighlight.setLastMove(data.move);
        return;
    }
    
    // Если это отмена или сброс - очищаем подсветку
    if (data && (data.undo || data.reset || data.clear)) {
        console.log('🔄 Очистка подсветки (undo/reset/clear)');
        window.moveHighlight.clearLastMove();
        return;
    }
}

// Сохраняем оригинальный обработчик
if (window.socket) {
    const originalOn = window.socket.on;
    
    window.socket.on = function(event, callback) {
        if (event === 'board_update') {
            const wrappedCallback = function(data) {
                // Сначала вызываем синхронизацию подсветки
                syncMoveHighlightFromGame(data);
                
                // Потом вызываем оригинальный callback
                callback(data);
            };
            originalOn.call(window.socket, event, wrappedCallback);
        } else {
            originalOn.call(window.socket, event, callback);
        }
    };
    
    // Также добавляем прямой обработчик для надёжности
    window.socket.on('board_update', function(data) {
        if (data.move && window.moveHighlight) {
            console.log('📥 Прямая синхронизация подсветки из board_update');
            window.moveHighlight.setLastMove(data.move);
        }
    });
}

console.log('✅ Синхронизация подсветки ходов настроена');
