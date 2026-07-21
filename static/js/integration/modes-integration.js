// static/js/integration/modes-integration.js

(function() {
    'use strict';
    
    console.log('🔄 Загрузка интеграции режимов...');
    
    const MODE_DESCRIPTIONS = {
        'classic': '♟️ Общие правила: игра с очередью ходов, проверка всех шахматных правил',
        'marseille': '♟️ Марсельские шахматы: по 2 хода за turn. При шахе второй ход теряется',
        'no_turn': '♟️ Без очереди: правила работают, но ходить можно в любом порядке',
        'no_rules': '♟️ Без правил: полная свобода, можно ходить любыми фигурами куда угодно'
    };
    
    const MODE_NAMES = {
        'classic': 'Общие правила',
        'marseille': 'Марсельские шахматы (2 хода)',
        'no_turn': 'Без очереди',
        'no_rules': 'Без правил'
    };

    // Делаем updateModeUI глобальной функцией
    window.updateModeUI = function(mode) {
        // Обновляем кнопки
        const buttons = document.querySelectorAll('.mode-btn');
        let activeFound = false;
        
        buttons.forEach(btn => {
            const btnMode = btn.dataset.mode;
            const isActive = btnMode === mode;
            
            if (isActive) {
                btn.classList.add('active');
                activeFound = true;
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (!activeFound && buttons.length > 0) {
            buttons[0].classList.add('active');
        }
        
        // Обновляем подсказку
        const hint = document.getElementById('modeHint');
        if (hint) {
            hint.textContent = MODE_DESCRIPTIONS[mode] || MODE_DESCRIPTIONS['classic'];
            hint.classList.add('active');
        }
        
        // Обновляем сайдбар
        const modeDisplay = document.getElementById('modeDisplay');
        if (modeDisplay) {
            const modeName = MODE_NAMES[mode] || mode;
            modeDisplay.textContent = modeName;
            modeDisplay.className = 'value';
            modeDisplay.classList.add(`mode-${mode}`);
            modeDisplay.classList.remove('changing');
            void modeDisplay.offsetHeight;
            modeDisplay.classList.add('changing');
        }
        
        updateModeColors(mode);
        console.log(`🎮 UI обновлён для режима: ${mode}`);
    };
        
    function updateModeColors(mode) {
        const buttons = document.querySelectorAll('.mode-btn');
        const colorMap = {
            'classic': '#28a745',
            'marseille': '#17a2b8',
            'no_turn': '#ffc107',
            'no_rules': '#dc3545'
        };
        
        const color = colorMap[mode] || '#28a745';
        
        buttons.forEach(btn => {
            const btnMode = btn.dataset.mode;
            const isActive = btnMode === mode;
            
            if (isActive) {
                const indicator = btn.querySelector('.mode-indicator');
                if (indicator) {
                    indicator.style.background = color;
                    indicator.style.borderColor = color;
                    indicator.style.boxShadow = `0 0 12px ${color}66`;
                }
                btn.style.color = color;
                btn.style.borderColor = color;
                btn.style.background = `${color}1A`;
            } else {
                const indicator = btn.querySelector('.mode-indicator');
                if (indicator) {
                    indicator.style.background = 'transparent';
                    indicator.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    indicator.style.boxShadow = 'none';
                }
                btn.style.color = '#aaa';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                btn.style.background = 'rgba(255, 255, 255, 0.03)';
            }
        });
    }
    
    function syncModeWithServer(mode) {
        if (window.socket && window.currentRoom) {
            window.socket.emit('set_game_mode', {
                room_id: window.currentRoom,
                mode: mode
            });
            console.log(`📤 Режим отправлен на сервер: ${mode}`);
        }
    }
    
    // Глобальная функция смены режима
    window.setGameMode = function(mode) {
        if (!window.gameModes) {
            console.warn('⚠️ GameModes не найден');
            if (typeof showToast === 'function') {
                showToast('⚠️ Система режимов не загружена', 'error');
            }
            return;
        }
        
        // Проверяем, что мы в комнате
        if (!window.currentRoom) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Сначала присоединитесь к игре', 'info');
            }
            return;
        }
        
        // Устанавливаем режим
        window.gameModes.setMode(mode);
        updateModeUI(mode);
        syncModeWithServer(mode);
        
        if (typeof updateStatus === 'function') {
            updateStatus();
        }
        
        const modeNames = {
            'classic': 'Общие правила',
            'marseille': 'Марсельские шахматы',
            'no_turn': 'Без очереди',
            'no_rules': 'Без правил'
        };
        
        if (typeof showToast === 'function') {
            showToast(`🎮 Режим: ${modeNames[mode] || mode}`, 'info');
        }
        
        if (typeof updateHistoryDisplay === 'function') {
            updateHistoryDisplay();
        }
        
        if (typeof window.renderBoard === 'function') {
            window.selectedCell = null;
            window.renderBoard();
        }
        
        console.log(`✅ Режим установлен: ${mode}`);
    };
    
    function initModes() {
        console.log('🔧 Инициализация режимов...');
        
        if (!window.gameModes) {
            console.warn('⚠️ GameModes не найден, повтор через 500ms');
            setTimeout(initModes, 500);
            return;
        }
        
        // Устанавливаем режим по умолчанию
        const defaultMode = window.gameModes.MODES.CLASSIC;
        window.gameModes.setMode(defaultMode);
        updateModeUI(defaultMode);
        setupSocketHandlers();
        
        window.gameModes.on('modeChanged', function(data) {
            console.log('🔄 Режим изменён через gameModes:', data.mode);
            updateModeUI(data.mode);
        });
        
        console.log(`✅ Режимы инициализированы (по умолчанию: ${defaultMode})`);
    }
    
    function setupSocketHandlers() {
        if (!window.socket) {
            console.warn('⚠️ Сокет не найден');
            return;
        }
        
        // ✅ Получение режима с сервера при обновлении
        window.socket.on('mode_update', function(data) {
            console.log('📥 Получен режим с сервера:', data);
            if (data.mode && window.gameModes) {
                window.gameModes.setMode(data.mode);
                updateModeUI(data.mode);
                
                // Если это Марсельские шахматы - сбрасываем состояние
                if (data.mode === 'marseille' && window.gameModes) {
                    window.gameModes.initMarseille();
                    console.log('♟️ Марсельские шахматы переинициализированы при получении режима');
                }
                
                if (typeof updateStatus === 'function') {
                    updateStatus();
                }
                if (typeof showToast === 'function') {
                    const modeNames = {
                        'classic': 'Общие правила',
                        'marseille': 'Марсельские шахматы',
                        'no_turn': 'Без очереди',
                        'no_rules': 'Без правил'
                    };
                    showToast(`🎮 Режим изменён на: ${modeNames[data.mode] || data.mode}`, 'info');
                }
            }
        });
                
        // ✅ Запрос режима при подключении
        window.socket.on('joined', function(data) {
            console.log('📥 joined в modes-integration:', data);
            if (data.mode && window.gameModes) {
                // ПРИНУДИТЕЛЬНО устанавливаем режим, даже если он такой же
                const currentMode = window.gameModes.getMode();
                if (currentMode !== data.mode) {
                    console.log(`🎮 Синхронизация режима при присоединении: ${data.mode}`);
                    window.gameModes.setMode(data.mode);
                    updateModeUI(data.mode);
                } else {
                    console.log(`🎮 Режим уже установлен: ${data.mode}`);
                    // Всё равно обновляем UI на всякий случай
                    updateModeUI(data.mode);
                }
            }

            // ДОПОЛНИТЕЛЬНО: запрашиваем режим с сервера для уверенности
            if (window.socket && data.room_id) {
                setTimeout(function() {
                    window.socket.emit('get_game_mode', { room_id: data.room_id });
                    console.log('📤 Запрос режима с сервера после joined');
                }, 200);
            }
        });
        
        // ✅ Синхронизация режима из board_update
        window.socket.on('board_update', function(data) {
            if (data.game_mode && window.gameModes) {
                const currentMode = window.gameModes.getMode();
                if (currentMode !== data.game_mode) {
                    console.log(`🎮 Синхронизация режима из board_update: ${data.game_mode}`);
                    window.gameModes.setMode(data.game_mode);
                    updateModeUI(data.game_mode);
                }
            }
        });
        
        // ✅ Обработчик ответа на запрос режима
        window.socket.on('mode_response', function(data) {
            console.log('📥 Получен ответ на запрос режима (mode_response):', data);
            if (data.mode && window.gameModes) {
                const currentMode = window.gameModes.getMode();
                console.log(`🎮 Текущий режим: ${currentMode}, получен с сервера: ${data.mode}`);
                if (currentMode !== data.mode) {
                    console.log(`🎮 Принудительная синхронизация режима из mode_response: ${data.mode}`);
                    window.gameModes.setMode(data.mode);
                    updateModeUI(data.mode);
                } else {
                    // Всё равно обновляем UI на всякий случай
                    updateModeUI(data.mode);
                }
            }
        });
        
        console.log('✅ Обработчики сокета для режимов настроены');
    }
    
    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initModes, 100);
        });
    } else {
        setTimeout(initModes, 100);
    }
    
    console.log('✅ Интеграция режимов загружена');
    
})();