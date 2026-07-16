// ============================================
// МОДУЛЬ СТРЕЛОК
// ============================================

class ArrowSystem {
    constructor(socketManager) {
        this.socket = socketManager;
        this.arrows = [];
        this.arrowMode = false;
        this.currentColor = '#ff0000';
        this.colors = ['#ff0000', '#00ff00', '#ffff00', '#00aaff', '#ff00ff', '#ff8800', '#ff1493', '#00ffcc'];
        this.colorIndex = 0;
        this.isDrawing = false;
        this.startCell = null;
        this.endCell = null;
        this.tempArrow = null;
        this.boardElement = null;
        this.isInitialized = false;
        
        // Привязка методов
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        this.isInitialized = true;
    }
    
    setup() {
        this.boardElement = document.getElementById('chessBoard');
        if (!this.boardElement) {
            console.warn('⚠️ Board element not found for arrows');
            return;
        }
        
        this.setupEventListeners();
        this.setupSocketEvents();
        console.log('🎯 Система стрелок инициализирована');
    }
    
    // === УПРАВЛЕНИЕ РЕЖИМОМ ===
    toggleMode() {
        this.arrowMode = !this.arrowMode;
        const btn = document.getElementById('arrowToggle');
        if (btn) {
            btn.classList.toggle('active');
            btn.textContent = this.arrowMode ? '📐 Рисование (вкл)' : '📐 Режим стрелок';
            if (this.arrowMode) {
                btn.style.background = '#ffd700';
                btn.style.color = '#1a1a2e';
            } else {
                btn.style.background = '';
                btn.style.color = '';
            }
        }
        
        const picker = document.getElementById('arrowColorPicker');
        if (picker) {
            picker.style.display = this.arrowMode ? 'flex' : 'none';
        }
        
        if (typeof showToast === 'function') {
            showToast(this.arrowMode ? '📐 Режим рисования стрелок включён' : '📐 Режим рисования стрелок выключен', 'info');
        }
        
        return this.arrowMode;
    }
    
    setColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.arrow-color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
    }
    
    nextColor() {
        this.colorIndex = (this.colorIndex + 1) % this.colors.length;
        this.setColor(this.colors[this.colorIndex]);
        if (typeof showToast === 'function') {
            showToast(`🎨 Цвет стрелки изменён`, 'info');
        }
    }
    
    clearAll() {
        if (!window.currentRoom) {
            if (typeof showToast === 'function') {
                showToast('⚠️ Сначала присоединитесь к игре', 'info');
            }
            return;
        }
        
        this.arrows = [];
        this.render();
        this.socket.emit('clear_arrows', { room_id: window.currentRoom });
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
        if (this.arrowMode) {
            e.preventDefault();
            return false;
        }
    }
    
    onMouseDown(e) {
        if (!this.arrowMode) return;
        if (e.button !== 2) return;
        
        const cell = e.target.closest('.chess-cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        e.preventDefault();
        e.stopPropagation();
        
        if (!window.currentRoom) {
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
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
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
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDrawing = false;
        this.removeTemporaryArrow();
        
        if (this.startCell && this.endCell) {
            const fromRow = this.startCell.row;
            const fromCol = this.startCell.col;
            const toRow = this.endCell.row;
            const toCol = this.endCell.col;
            
            if (fromRow !== toRow || fromCol !== toCol) {
                const roomId = window.currentRoom || document.getElementById('roomDisplay')?.textContent;
                
                console.log('📤 Отправка стрелки:', {
                    room_id: roomId,
                    from: { row: fromRow, col: fromCol },
                    to: { row: toRow, col: toCol },
                    color: this.currentColor
                });
                
                if (roomId && roomId !== '—') {
                    this.socket.emit('draw_arrow', {
                        room_id: roomId,
                        from: { row: fromRow, col: fromCol },
                        to: { row: toRow, col: toCol },
                        color: this.currentColor
                    });
                } else {
                    console.warn('⚠️ Нет комнаты для отправки стрелки');
                    if (typeof showToast === 'function') {
                        showToast('⚠️ Сначала присоединитесь к игре', 'info');
                    }
                }
            } else {
                console.log('ℹ️ Стрелка нулевая (начало = конец)');
            }
        }
        
        this.startCell = null;
        this.endCell = null;
    }
    
    // === ОТРИСОВКА СТРЕЛОК ===
    createTemporaryArrow(fromRow, fromCol, toRow, toCol) {
        this.removeTemporaryArrow();
        
        const boardEl = this.boardElement;
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
        
        // Свечение
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        glow.setAttribute('x1', fromX);
        glow.setAttribute('y1', fromY);
        glow.setAttribute('x2', toX);
        glow.setAttribute('y2', toY);
        glow.setAttribute('stroke', color);
        glow.setAttribute('stroke-width', lineWidth + 12);
        glow.setAttribute('stroke-linecap', 'round');
        glow.setAttribute('opacity', '0.15');
        glow.style.filter = 'blur(8px)';
        svg.appendChild(glow);
        
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
            console.log('ℹ️ Нет стрелок для отображения');
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
            
            this.arrows.forEach((arrow, index) => {
                try {
                    const fromX = (arrow.from.col + 0.5) * cellSize;
                    const fromY = (arrow.from.row + 0.5) * cellSize;
                    const toX = (arrow.to.col + 0.5) * cellSize;
                    const toY = (arrow.to.row + 0.5) * cellSize;
                    this.drawArrow(svg, fromX, fromY, toX, toY, arrow.color);
                } catch (err) {
                    console.warn(`⚠️ Ошибка при отрисовке стрелки ${index}:`, err);
                }
            });
            
            boardEl.style.position = 'relative';
            boardEl.appendChild(svg);
            console.log(`✅ Отрисовано ${this.arrows.length} стрелок`);
        } catch (error) {
            console.error('❌ Ошибка при рендере стрелок:', error);
        }
    }
    
    // === SOCKET СОБЫТИЯ (РАБОЧАЯ ВЕРСИЯ ИЗ КОНСОЛИ) ===
    setupSocketEvents() {
        console.log('🔧 Настройка socket событий для стрелок...');
        
        // Удаляем все старые обработчики
        this.socket.off('arrow_drawn');
        this.socket.off('arrow_removed');
        this.socket.off('arrows_cleared');
        
        // Обработчик получения стрелки (точно такой же как в консоли)
        this.socket.on('arrow_drawn', (data) => {
            console.log('📥 arrow_drawn ПОЛУЧЕН (из файла):', data);
            
            if (!window.arrowSystem) {
                console.warn('⚠️ ArrowSystem не найден');
                return;
            }
            
            const exists = window.arrowSystem.arrows.some(a => a.id === data.arrow.id);
            if (exists) {
                console.log('ℹ️ Стрелка уже существует');
                return;
            }
            
            window.arrowSystem.arrows.push(data.arrow);
            console.log('✅ Стрелка добавлена, всего:', window.arrowSystem.arrows.length);
            window.arrowSystem.render();
        });
        
        this.socket.on('arrow_removed', (data) => {
            console.log('🗑️ arrow_removed:', data);
            this.arrows = this.arrows.filter(a => a.id !== data.arrow_id);
            this.render();
        });
        
        this.socket.on('arrows_cleared', (data) => {
            console.log('🧹 arrows_cleared:', data);
            this.arrows = [];
            this.render();
        });
        
        console.log('✅ Socket события для стрелок настроены');
        console.log('Обработчик arrow_drawn зарегистрирован:', !!this.socket._events?.['arrow_drawn']);
    }
    
    // === ОБЩЕДОСТУПНЫЕ МЕТОДЫ ===
    setArrows(arrows) {
        this.arrows = arrows || [];
        this.render();
    }
    
    getArrows() {
        return this.arrows;
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
        
        console.log('✅ ArrowSystem создан с глобальными функциями');
    }
    return arrowSystem;
}

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.socketManager) {
            initArrowSystem(window.socketManager);
        }
    });
} else {
    if (window.socketManager) {
        initArrowSystem(window.socketManager);
    }
}

// Экспорт для модульной системы
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArrowSystem, initArrowSystem, arrowSystem };
}

console.log('📐 Модуль arrows.js загружен');
