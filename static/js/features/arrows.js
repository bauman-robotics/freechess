// static/js/features/arrows.js

// ============================================
// МОДУЛЬ СТРЕЛОК
// ============================================

class ArrowSystem {
    constructor(socketManager) {
        console.log('🎯 Создание ArrowSystem...');
        
        this.socket = socketManager;
        this.arrows = [];
        this.arrowMode = true;
        this.flipped = false;
        this.currentColor = '#00aa44';
        this.colors = ['#00aa44', '#ff0000', '#ffff00', '#00aaff', '#ff00ff', '#ff8800', '#ff1493', '#00ffcc'];
        this.colorIndex = 0;
        this.isDrawing = false;
        this.startCell = null;
        this.endCell = null;
        this.tempArrow = null;
        this.boardElement = null;
        this.isInitialized = false;
        this.currentRoom = null;
        this.renderTimeout = null;
        this.lastRenderTime = 0;
        this.renderQueue = [];
        this.isRendering = false;
        
        // Привязка методов
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.throttledRender = this.throttledRender.bind(this);
        
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
        this.setupRoomListener();
        
        console.log('🎯 Система стрелок настроена');
    }
    
    // ============================================
    // ОПТИМИЗИРОВАННЫЙ РЕНДЕРИНГ С ПЛАВНОСТЬЮ
    // ============================================
    
    throttledRender() {
        // Очищаем предыдущий таймаут
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
            this.renderTimeout = null;
        }
        
        // Если рендеринг уже идёт, просто добавляем в очередь
        if (this.isRendering) {
            this.renderQueue.push(Date.now());
            return;
        }
        
        // Запускаем рендеринг с небольшой задержкой для группировки обновлений
        this.renderTimeout = setTimeout(() => {
            this.renderTimeout = null;
            this.performRender();
        }, 16); // ~1 кадр при 60fps
    }
    
    performRender() {
        if (this.isRendering) {
            return;
        }
        
        this.isRendering = true;
        
        try {
            // Удаляем старые стрелки
            const oldArrows = document.querySelectorAll('.board-arrows');
            oldArrows.forEach(el => {
                // Плавное исчезновение вместо мгновенного удаления
                el.style.transition = 'opacity 0.15s ease-out';
                el.style.opacity = '0';
                setTimeout(() => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                }, 150);
            });
            
            // Если нет стрелок, просто выходим
            if (!this.arrows || this.arrows.length === 0) {
                this.isRendering = false;
                return;
            }
            
            const boardEl = this.boardElement;
            if (!boardEl) {
                this.isRendering = false;
                return;
            }
            
            // Создаём новые стрелки с плавным появлением
            setTimeout(() => {
                this.renderArrows();
                this.isRendering = false;
                
                // Проверяем, есть ли ещё запросы в очереди
                if (this.renderQueue.length > 0) {
                    this.renderQueue = [];
                    this.throttledRender();
                }
            }, 50);
            
        } catch (error) {
            console.error('❌ Ошибка при рендере стрелок:', error);
            this.isRendering = false;
        }
    }
    
    renderArrows() {
        const boardEl = this.boardElement;
        if (!boardEl) return;
        
        try {
            const rect = boardEl.getBoundingClientRect();
            const cellSize = rect.width / 8;
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'board-arrows');
            svg.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10;
                opacity: 0;
                transition: opacity 0.2s ease-in;
            `;
            
            const isFlipped = window.flipped || false;
            
            this.arrows.forEach((arrow) => {
                let fromRow = arrow.from.row;
                let fromCol = arrow.from.col;
                let toRow = arrow.to.row;
                let toCol = arrow.to.col;
                
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
            
            // Плавное появление
            requestAnimationFrame(() => {
                svg.style.opacity = '1';
            });
            
        } catch (error) {
            console.error('❌ Ошибка при создании стрелок:', error);
        }
    }
    
    // Старый метод render теперь вызывает оптимизированную версию
    render() {
        this.throttledRender();
    }
    
    // ============================================
    // ВРЕМЕННАЯ СТРЕЛКА (БЕЗ МЕРЦАНИЯ)
    // ============================================
    
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
        svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            opacity: 0.8;
        `;
        
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
            // Плавное исчезновение временной стрелки
            this.tempArrow.style.transition = 'opacity 0.15s ease-out';
            this.tempArrow.style.opacity = '0';
            setTimeout(() => {
                if (this.tempArrow && this.tempArrow.parentNode) {
                    this.tempArrow.parentNode.removeChild(this.tempArrow);
                }
                this.tempArrow = null;
            }, 150);
        }
    }
    
    // ============================================
    // ОСТАЛЬНЫЕ МЕТОДЫ (без изменений)
    // ============================================
    
    setupRoomListener() {
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
        
        const roomId = document.getElementById('roomDisplay')?.textContent;
        if (roomId && roomId !== '—') {
            this.currentRoom = roomId;
            console.log('📌 Текущая комната в ArrowSystem:', this.currentRoom);
        }
    }
    
    toggleMode() {
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
        
        this.socket.emit('clear_arrows', { room_id: roomId });
        this.arrows = [];
        this.render();
        
        if (typeof showToast === 'function') {
            showToast('🧹 Все стрелки удалены', 'info');
        }
    }
    
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
        e.preventDefault();
        return false;
    }
    
    onMouseDown(e) {
        if (e.button !== 2) return;
        
        const cell = e.target.closest('.chess-cell');
        if (!cell) return;
        
        let row = parseInt(cell.dataset.row);
        let col = parseInt(cell.dataset.col);
        
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
                    
                    const arrow = {
                        id: `arrow_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        from: { row: fromRow, col: fromCol },
                        to: { row: toRow, col: toCol },
                        color: this.currentColor,
                        player_id: this.socket.id || 'local'
                    };
                    
                    this.arrows.push(arrow);
                    this.render();
                    
                    this.socket.emit('draw_arrow', {
                        room_id: roomId,
                        from: { row: fromRow, col: fromCol },
                        to: { row: toRow, col: toCol },
                        color: this.currentColor
                    });
                }
            }
        }
        
        this.startCell = null;
        this.endCell = null;
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
    
    setupSocketEvents() {
        if (!this.socket) {
            console.warn('⚠️ Сокет не найден для настройки событий');
            return;
        }
        
        this.socket.off('arrow_drawn');
        this.socket.off('arrow_removed');
        this.socket.off('arrows_cleared');
        
        this.socket.on('arrow_drawn', (data) => {
            console.log('📥 arrow_drawn получен:', data);
            
            if (!window.arrowSystem) {
                console.warn('⚠️ ArrowSystem не найден');
                return;
            }
            
            if (data.room_id !== this.currentRoom && data.room_id !== window.currentRoom) {
                console.log('ℹ️ Стрелка из другой комнаты:', data.room_id);
                return;
            }
            
            const exists = window.arrowSystem.arrows.some(function(a) {
                return a.id === data.arrow.id;
            });
            
            if (exists) {
                console.log('ℹ️ Стрелка уже существует');
                return;
            }
            
            window.arrowSystem.arrows.push(data.arrow);
            window.arrowSystem.render();
            
            if (data.arrow.player_id && data.arrow.player_id !== window.arrowSystem.socket.id) {
                if (typeof showToast === 'function') {
                    showToast('📐 Соперник нарисовал стрелку', 'info');
                }
            }
        });
        
        this.socket.on('arrow_removed', (data) => {
            if (data.room_id !== this.currentRoom && data.room_id !== window.currentRoom) {
                return;
            }
            this.arrows = this.arrows.filter(function(a) {
                return a.id !== data.arrow_id;
            });
            this.render();
        });
        
        this.socket.on('arrows_cleared', (data) => {
            console.log('📥 Получено событие arrows_cleared:', data);
            
            if (data.room_id !== this.currentRoom && data.room_id !== window.currentRoom) {
                console.log('ℹ️ Очистка стрелок в другой комнате:', data.room_id);
                return;
            }
            
            this.arrows = [];
            this.render();
            
            if (typeof showToast === 'function') {
                showToast('🧹 Все стрелки удалены', 'info');
            }
            
            console.log('✅ Стрелки очищены локально, всего:', this.arrows.length);
        });
        
        console.log('✅ События стрелок настроены');
    }
    
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
        
        const btnHeight = btn.offsetHeight || 30;
        const dotSize = Math.max(10, Math.round(btnHeight / 3));
        
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
        
        console.log('✅ ArrowSystem создан с плавным рендерингом');
    }
    return arrowSystem;
}

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

console.log('📐 Модуль arrows.js загружен (плавный рендеринг)');