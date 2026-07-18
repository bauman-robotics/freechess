// static/js/features/arrows.js

// ============================================
// МОДУЛЬ СТРЕЛОК
// ============================================

class ArrowSystem {
    constructor(socketManager) {
        console.log('🎯 Создание ArrowSystem...');
        
        this.socket = socketManager;
        this.arrows = [];
        this.arrowMode = true; // ВСЕГДА ВКЛЮЧЕН
        this.flipped = false; 
        this.currentColor = '#00aa44';  // Тёмно-зелёный/изумрудный
        this.colors = ['#00aa44', '#ff0000', '#ffff00', '#00aaff', '#ff00ff', '#ff8800', '#ff1493', '#00ffcc'];
        this.colorIndex = 0;
        this.isDrawing = false;
        this.startCell = null;
        this.endCell = null;
        this.tempArrow = null;
        this.boardElement = null;
        this.isInitialized = false;
        this.currentRoom = null;
        
        // Привязка методов
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        
        // Сразу инициализируем
        this.init();
    }
    
    init() {
        if (this.isInitialized) {
            console.log('⚠️ ArrowSystem уже инициализирован');
            return;
        }
        
        console.log('🔧 Инициализация ArrowSystem...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        this.isInitialized = true;
        console.log('✅ ArrowSystem инициализирован');
    }
    
    setup() {
        console.log('🔧 Настройка ArrowSystem...');
        
        this.boardElement = document.getElementById('chessBoard');
        if (!this.boardElement) {
            console.warn('⚠️ Board element not found for arrows, повторная попытка через 500ms');
            setTimeout(() => this.setup(), 500);
            return;
        }
        
        this.setupEventListeners();
        this.setupSocketEvents();
        this.updateColorButton();
        
        // Подписываемся на изменения комнаты
        this.setupRoomListener();
        
        console.log('🎯 Система стрелок настроена (режим всегда включён)');
        console.log('  - boardElement:', !!this.boardElement);
        console.log('  - socket:', !!this.socket);
    }
    
    setupRoomListener() {
        // Слушаем изменения комнаты
        const roomDisplay = document.getElementById('roomDisplay');
        if (roomDisplay) {
            const observer = new MutationObserver(() => {
                const roomId = roomDisplay.textContent;
                if (roomId && roomId !== '—' && roomId !== this.currentRoom) {
                    this.currentRoom = roomId;
                    console.log('🔄 Комната обновлена в ArrowSystem:', roomId);
                }
            });
            observer.observe(roomDisplay, { childList: true, characterData: true, subtree: true });
        }
        
        // Если комната уже есть
        const roomId = document.getElementById('roomDisplay')?.textContent;
        if (roomId && roomId !== '—') {
            this.currentRoom = roomId;
            console.log('📌 Текущая комната в ArrowSystem:', this.currentRoom);
        }
    }
    
    // === УПРАВЛЕНИЕ РЕЖИМОМ ===
    toggleMode() {
        // Режим всегда включён, просто возвращаем true
        this.arrowMode = true;
        if (typeof showToast === 'function') {
            showToast('📐 Режим стрелок всегда включён', 'info');
        }
        return this.arrowMode;
    }
    
    setColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.arrow-color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
        this.updateColorButton();
    }

    nextColor() {
        this.colorIndex = (this.colorIndex + 1) % this.colors.length;
        this.setColor(this.colors[this.colorIndex]);
        this.updateColorButton();
        if (typeof showToast === 'function') {
            showToast(`🎨 Цвет стрелки изменён`, 'info');
        }
    }
    
    clearAll() {
        const roomId = this.currentRoom || window.currentRoom || document.getElementById('roomDisplay')?.textContent;
        
        if (!roomId || roomId === '—') {
            if (typeof showToast === 'function') {
                showToast('⚠️ Сначала присоединитесь к игре', 'info');
            }
            return;
        }
        
        console.log('🧹 Отправка clear_arrows в комнату:', roomId);
        
        // Отправляем на сервер
        this.socket.emit('clear_arrows', { room_id: roomId });
        
        // Локально очищаем сразу (оптимистичное обновление)
        this.arrows = [];
        this.render();
        
        if (typeof showToast === 'function') {
            showToast('🧹 Все стрелки удалены', 'info');
        }
    }
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    setupEventListeners() {
        document.addEventListener('contextmenu', this.onContextMenu);
        this.boardElement.addEventListener('mousedown', this.onMouseDown);
        this.boardElement.addEventListener('mousemove', this.onMouseMove);
        this.boardElement.addEventListener('mouseup', this.onMouseUp);
        
        document.addEventListener('mouseup', (e) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.removeTemporaryArrow();
                this.startCell = null;
                this.endCell = null;
            }
        });
    }
    
    onContextMenu(e) {
        // Режим всегда включён, поэтому всегда блокируем контекстное меню на доске
        e.preventDefault();
        return false;
    }
    
    onMouseDown(e) {
        if (e.button !== 2) return;
        
        const cell = e.target.closest('.chess-cell');
        if (!cell) return;
        
        let row = parseInt(cell.dataset.row);
        let col = parseInt(cell.dataset.col);
        
        // Если доска перевёрнута, конвертируем координаты обратно
        const isFlipped = window.flipped || false;
        if (isFlipped) {
            row = 7 - row;
            col = 7 - col;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const roomId = this.currentRoom || window.currentRoom || document.getElementById('roomDisplay')?.textContent;
        if (!roomId || roomId === '—') {
            if (typeof showToast === 'function') {
                showToast('⚠️ Сначала присоединитесь к игре', 'info');
            }
            return;
        }
        
        this.isDrawing = true;
        this.startCell = { row, col };
        this.endCell = { row, col };
        this.createTemporaryArrow(row, col, row, col);
    }
    
    onMouseMove(e) {
        if (!this.isDrawing || !this.startCell) return;
        
        const cell = e.target.closest('.chess-cell');
        if (!cell) return;
        
        let row = parseInt(cell.dataset.row);
        let col = parseInt(cell.dataset.col);
        
        // Если доска перевёрнута, конвертируем координаты обратно
        const isFlipped = window.flipped || false;
        if (isFlipped) {
            row = 7 - row;
            col = 7 - col;
        }
        
        this.endCell = { row, col };
        this.updateTemporaryArrow(this.startCell.row, this.startCell.col, row, col);
    }
    
    onMouseUp(e) {
        if (!this.isDrawing) return;
        if (e.button !== 2) return;
        
        const cell = e.target.closest('.chess-cell');
        if (!cell) {
            this.isDrawing = false;
            this.removeTemporaryArrow();
            this.startCell = null;
            this.endCell = null;
            return;
        }
        
        // Получаем координаты из dataset (уже с учётом переворота)
        let row = parseInt(cell.dataset.row);
        let col = parseInt(cell.dataset.col);
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDrawing = false;
        this.removeTemporaryArrow();
        
        if (this.startCell && this.endCell) {
            let fromRow = this.startCell.row;
            let fromCol = this.startCell.col;
            let toRow = this.endCell.row;
            let toCol = this.endCell.col;
            
            // Если доска перевёрнута, конвертируем координаты обратно
            const isFlipped = window.flipped || false;
            if (isFlipped) {
                fromRow = 7 - fromRow;
                fromCol = 7 - fromCol;
                toRow = 7 - toRow;
                toCol = 7 - toCol;
            }
            
            if (fromRow !== toRow || fromCol !== toCol) {
                const roomId = this.currentRoom || window.currentRoom || document.getElementById('roomDisplay')?.textContent;
                
                if (roomId && roomId !== '—') {
                    console.log('📤 Отправка стрелки:', { fromRow, fromCol, toRow, toCol });
                    
                    // ============================================
                    // ⚡ СОЗДАЁМ СТРЕЛКУ ЛОКАЛЬНО (ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ)
                    // ============================================
                    const arrow = {
                        id: `arrow_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        from: { row: fromRow, col: fromCol },
                        to: { row: toRow, col: toCol },
                        color: this.currentColor,
                        player_id: this.socket.id || 'local'
                    };
                    
                    // Добавляем локально
                    this.arrows.push(arrow);
                    this.render();
                    
                    // Отправляем на сервер
                    this.socket.emit('draw_arrow', {
                        room_id: roomId,
                        from: { row: fromRow, col: fromCol },
                        to: { row: toRow, col: toCol },
                        color: this.currentColor
                    });
                    
                    if (typeof showToast === 'function') {
                        showToast('📐 Стрелка нарисована', 'info');
                    }
                }
            }
        }
        
        this.startCell = null;
        this.endCell = null;
    }
    
    // === ОТРИСОВКА СТРЕЛОК ===
    createTemporaryArrow(fromRow, fromCol, toRow, toCol) {
        this.removeTemporaryArrow();
        
        const boardEl = this.boardElement;
        if (!boardEl) return;
        
        const rect = boardEl.getBoundingClientRect();
        const cellSize = rect.width / 8;
        
        const fromX = (fromCol + 0.5) * cellSize;
        const fromY = (fromRow + 0.5) * cellSize;
        const toX = (toCol + 0.5) * cellSize;
        const toY = (toRow + 0.5) * cellSize;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'tempArrow';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        
        this.drawArrow(svg, fromX, fromY, toX, toY, this.currentColor);
        
        boardEl.style.position = 'relative';
        boardEl.appendChild(svg);
        this.tempArrow = svg;
    }
    
    updateTemporaryArrow(fromRow, fromCol, toRow, toCol) {
        if (!this.tempArrow) return;
        
        const svg = this.tempArrow;
        const rect = this.boardElement.getBoundingClientRect();
        const cellSize = rect.width / 8;
        
        const fromX = (fromCol + 0.5) * cellSize;
        const fromY = (fromRow + 0.5) * cellSize;
        const toX = (toCol + 0.5) * cellSize;
        const toY = (toRow + 0.5) * cellSize;
        
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        this.drawArrow(svg, fromX, fromY, toX, toY, this.currentColor);
    }
    
    removeTemporaryArrow() {
        if (this.tempArrow) {
            this.tempArrow.remove();
            this.tempArrow = null;
        }
    }
    
    drawArrow(svg, fromX, fromY, toX, toY, color) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 5) return;
        
        const headLength = Math.min(25, length * 0.25);
        const headAngle = 0.6;
        const lineWidth = 5;
        
        // Основная линия
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', lineWidth);
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0.8');
        svg.appendChild(line);
        
        // Головка стрелки
        const points = [
            [toX, toY],
            [toX - headLength * Math.cos(angle - headAngle), toY - headLength * Math.sin(angle - headAngle)],
            [toX - headLength * Math.cos(angle + headAngle), toY - headLength * Math.sin(angle + headAngle)]
        ];
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.map(p => p.join(',')).join(' '));
        polygon.setAttribute('fill', color);
        polygon.setAttribute('opacity', '0.8');
        svg.appendChild(polygon);
        
        return svg;
    }
    
    render() {
        document.querySelectorAll('.board-arrows').forEach(el => el.remove());
        
        if (!this.arrows || this.arrows.length === 0) {
            return;
        }
        
        const boardEl = this.boardElement;
        if (!boardEl) {
            console.warn('⚠️ Board element not found');
            return;
        }
        
        try {
            const rect = boardEl.getBoundingClientRect();
            const cellSize = rect.width / 8;
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'board-arrows');
            svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;';
            
            // Проверяем, перевёрнута ли доска
            const isFlipped = window.flipped || false;
            
            this.arrows.forEach((arrow) => {
                let fromRow = arrow.from.row;
                let fromCol = arrow.from.col;
                let toRow = arrow.to.row;
                let toCol = arrow.to.col;
                
                // Если доска перевёрнута, зеркалируем координаты
                if (isFlipped) {
                    fromRow = 7 - fromRow;
                    fromCol = 7 - fromCol;
                    toRow = 7 - toRow;
                    toCol = 7 - toCol;
                }
                
                const fromX = (fromCol + 0.5) * cellSize;
                const fromY = (fromRow + 0.5) * cellSize;
                const toX = (toCol + 0.5) * cellSize;
                const toY = (toRow + 0.5) * cellSize;
                
                this.drawArrow(svg, fromX, fromY, toX, toY, arrow.color);
            });
            
            boardEl.style.position = 'relative';
            boardEl.appendChild(svg);
        } catch (error) {
            console.error('❌ Ошибка при рендере стрелок:', error);
        }
    }
    
    // === SOCKET СОБЫТИЯ ===
    setupSocketEvents() {
        if (!this.socket) {
            console.warn('⚠️ Сокет не найден для настройки событий');
            return;
        }
        
        // Удаляем старые обработчики
        this.socket.off('arrow_drawn');
        this.socket.off('arrow_removed');
        this.socket.off('arrows_cleared');
        
        // Обработчик добавления стрелки
        this.socket.on('arrow_drawn', (data) => {
            console.log('📥 arrow_drawn получен:', data);
            
            if (!window.arrowSystem) {
                console.warn('⚠️ ArrowSystem не найден');
                return;
            }
            
            // Проверяем, что это наша комната
            if (data.room_id !== this.currentRoom && data.room_id !== window.currentRoom) {
                console.log('ℹ️ Стрелка из другой комнаты:', data.room_id);
                return;
            }
            
            // Проверяем, существует ли уже такая стрелка
            const exists = window.arrowSystem.arrows.some(function(a) {
                return a.id === data.arrow.id;
            });
            
            if (exists) {
                console.log('ℹ️ Стрелка уже существует');
                return;
            }
            
            // Добавляем стрелку
            window.arrowSystem.arrows.push(data.arrow);
            window.arrowSystem.render();
            
            // Показываем уведомление, если стрелка от другого игрока
            if (data.arrow.player_id && data.arrow.player_id !== window.arrowSystem.socket.id) {
                if (typeof showToast === 'function') {
                    showToast('📐 Соперник нарисовал стрелку', 'info');
                }
            }
        });
        
        // Обработчик удаления стрелки
        this.socket.on('arrow_removed', (data) => {
            if (data.room_id !== this.currentRoom && data.room_id !== window.currentRoom) {
                return;
            }
            this.arrows = this.arrows.filter(function(a) {
                return a.id !== data.arrow_id;
            });
            this.render();
        });
        
        // Обработчик очистки всех стрелок
        this.socket.on('arrows_cleared', (data) => {
            console.log('📥 Получено событие arrows_cleared:', data);
            
            // Проверяем, что это наша комната
            if (data.room_id !== this.currentRoom && data.room_id !== window.currentRoom) {
                console.log('ℹ️ Очистка стрелок в другой комнате:', data.room_id);
                return;
            }
            
            // Очищаем локальные стрелки
            this.arrows = [];
            this.render();
            
            // Показываем уведомление
            if (typeof showToast === 'function') {
                showToast('🧹 Все стрелки удалены', 'info');
            }
            
            console.log('✅ Стрелки очищены локально, всего:', this.arrows.length);
        });
        
        console.log('✅ События стрелок настроены');
    }
    
    // === ОБЩЕДОСТУПНЫЕ МЕТОДЫ ===
    setArrows(arrows) {
        this.arrows = arrows || [];
        this.render();
    }
    
    getArrows() {
        return this.arrows;
    }
    
    setFlipped(flipped) {
        this.flipped = flipped;
        this.render();
    }

    setRoom(roomId) {
        this.currentRoom = roomId;
        console.log('📌 Комната установлена в ArrowSystem:', roomId);
    }

    updateColorButton() {
        const btn = document.getElementById('colorBtn');
        if (!btn) return;
        
        // Получаем высоту кнопки
        const btnHeight = btn.offsetHeight || 30;
        const dotSize = Math.max(10, Math.round(btnHeight / 3));
        
        // Создаём индикатор цвета (точка)
        const indicator = document.createElement('span');
        indicator.className = 'color-indicator';
        indicator.style.cssText = `
            display: inline-block;
            width: ${dotSize}px;
            height: ${dotSize}px;
            border-radius: 50%;
            background: ${this.currentColor};
            border: 2px solid rgba(255,255,255,0.4);
            margin-left: 6px;
            vertical-align: middle;
            flex-shrink: 0;
            transition: background 0.3s ease, transform 0.2s ease;
            box-shadow: 0 0 8px ${this.currentColor}44;
        `;
        
        // Очищаем кнопку и добавляем текст + индикатор
        btn.innerHTML = '';
        btn.appendChild(document.createTextNode('🎨 Цвет '));
        btn.appendChild(indicator);
    }

    destroy() {
        document.removeEventListener('contextmenu', this.onContextMenu);
        if (this.boardElement) {
            this.boardElement.removeEventListener('mousedown', this.onMouseDown);
            this.boardElement.removeEventListener('mousemove', this.onMouseMove);
            this.boardElement.removeEventListener('mouseup', this.onMouseUp);
        }
        this.arrows = [];
        this.render();
        this.isInitialized = false;
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

let arrowSystem = null;

function initArrowSystem(socketManager) {
    if (!arrowSystem) {
        arrowSystem = new ArrowSystem(socketManager);
        window.arrowSystem = arrowSystem;
        
        // Глобальные функции для HTML
        window.toggleArrowMode = function() {
            if (arrowSystem) {
                return arrowSystem.toggleMode();
            }
            console.warn('⚠️ ArrowSystem не инициализирован');
        };
        
        window.clearArrows = function() {
            if (arrowSystem) {
                return arrowSystem.clearAll();
            }
            console.warn('⚠️ ArrowSystem не инициализирован');
        };
        
        window.nextArrowColor = function() {
            if (arrowSystem) {
                return arrowSystem.nextColor();
            }
            console.warn('⚠️ ArrowSystem не инициализирован');
        };
        
        console.log('✅ ArrowSystem создан (режим всегда включён, зелёные стрелки)');
    }
    return arrowSystem;
}

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.socketManager) {
            initArrowSystem(window.socketManager);
        } else if (window.socket) {
            initArrowSystem(window.socket);
        }
    });
} else {
    if (window.socketManager) {
        initArrowSystem(window.socketManager);
    } else if (window.socket) {
        initArrowSystem(window.socket);
    }
}

console.log('📐 Модуль arrows.js загружен (зелёные стрелки, режим всегда включён)');