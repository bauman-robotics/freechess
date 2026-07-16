// static/js/features/moveHighlight.js

// ============================================
// МОДУЛЬ ПОДСВЕТКИ ПОСЛЕДНЕГО ХОДА
// ============================================

class MoveHighlight {
    constructor() {
        this.lastMove = {
            from: null,  // { row, col }
            to: null     // { row, col }
        };
        this.highlightClassFrom = 'last-move-from';
        this.highlightClassTo = 'last-move-to';
        this.enabled = true;
        this.listeners = [];
        
        // Привязка методов
        this.setLastMove = this.setLastMove.bind(this);
        this.clearLastMove = this.clearLastMove.bind(this);
        this.getLastMove = this.getLastMove.bind(this);
        this.applyHighlight = this.applyHighlight.bind(this);
        this.removeHighlight = this.removeHighlight.bind(this);
        
        console.log('🎯 Модуль подсветки ходов инициализирован');
    }
    
    // === УПРАВЛЕНИЕ ПОСЛЕДНИМ ХОДОМ ===
    
    /**
     * Устанавливает последний ход
     * @param {Object} move - { from: {row, col}, to: {row, col} }
     */
    setLastMove(move) {
        if (!move) {
            this.clearLastMove();
            return;
        }
        
        // Проверяем валидность координат
        if (this.isValidCell(move.from) && this.isValidCell(move.to)) {
            this.lastMove = {
                from: { ...move.from },
                to: { ...move.to }
            };
            this.notifyListeners('update', this.lastMove);
            console.log(`🎯 Последний ход: ${move.from.row},${move.from.col} → ${move.to.row},${move.to.col}`);
        } else {
            console.warn('⚠️ Неверные координаты хода:', move);
        }
    }
    
    /**
     * Очищает подсветку последнего хода
     */
    clearLastMove() {
        this.lastMove = { from: null, to: null };
        this.notifyListeners('clear');
        console.log('🎯 Подсветка хода очищена');
    }
    
    /**
     * Получает данные о последнем ходе
     * @returns {Object} - { from, to }
     */
    getLastMove() {
        return { ...this.lastMove };
    }
    
    /**
     * Проверяет, есть ли подсвеченный ход
     * @returns {boolean}
     */
    hasLastMove() {
        return !!(this.lastMove.from && this.lastMove.to);
    }
    
    // === ВАЛИДАЦИЯ ===
    
    /**
     * Проверяет валидность клетки
     * @param {Object} cell - { row, col }
     * @returns {boolean}
     */
    isValidCell(cell) {
        return cell && 
               typeof cell.row === 'number' && 
               typeof cell.col === 'number' &&
               cell.row >= 0 && cell.row < 8 &&
               cell.col >= 0 && cell.col < 8;
    }
    
    /**
     * Проверяет, совпадает ли клетка с началом хода
     * @param {number} row - Строка
     * @param {number} col - Колонка
     * @returns {boolean}
     */
    isFromCell(row, col) {
        return this.lastMove.from && 
               this.lastMove.from.row === row && 
               this.lastMove.from.col === col;
    }
    
    /**
     * Проверяет, совпадает ли клетка с концом хода
     * @param {number} row - Строка
     * @param {number} col - Колонка
     * @returns {boolean}
     */
    isToCell(row, col) {
        return this.lastMove.to && 
               this.lastMove.to.row === row && 
               this.lastMove.to.col === col;
    }
    
    /**
     * Проверяет, должна ли клетка быть подсвечена
     * @param {number} row - Строка
     * @param {number} col - Колонка
     * @returns {boolean}
     */
    isHighlighted(row, col) {
        return this.isFromCell(row, col) || this.isToCell(row, col);
    }
    
    // === ПРИМЕНЕНИЕ ПОДСВЕТКИ К DOM ===
    
    /**
     * Применяет подсветку к клетке
     * @param {HTMLElement} cell - DOM элемент клетки
     * @param {number} row - Строка
     * @param {number} col - Колонка
     */
    applyHighlight(cell, row, col) {
        if (!this.enabled || !cell) return;
        
        if (this.isFromCell(row, col)) {
            cell.classList.add(this.highlightClassFrom);
            // Добавляем анимацию
            cell.style.animation = 'none';
            // Триггер перерисовки анимации
            void cell.offsetHeight;
            cell.style.animation = `move-highlight-lichess 0.4s ease-out`;
        } else if (this.isToCell(row, col)) {
            cell.classList.add(this.highlightClassTo);
            cell.style.animation = 'none';
            void cell.offsetHeight;
            cell.style.animation = `move-highlight-lichess 0.4s ease-out`;
        }
    }
    
    /**
     * Удаляет подсветку с клетки
     * @param {HTMLElement} cell - DOM элемент клетки
     */
    removeHighlight(cell) {
        if (!cell) return;
        cell.classList.remove(this.highlightClassFrom, this.highlightClassTo);
        cell.style.animation = '';
    }
    
    /**
     * Очищает всю подсветку на доске
     */
    clearAllHighlights() {
        document.querySelectorAll(`.${this.highlightClassFrom}, .${this.highlightClassTo}`)
            .forEach(cell => {
                cell.classList.remove(this.highlightClassFrom, this.highlightClassTo);
                cell.style.animation = '';
            });
    }
    
    // === ИНТЕГРАЦИЯ С РЕНДЕРИНГОМ ===
    
    /**
     * Создаёт обёртку для рендеринга клеток
     * @param {Function} renderFunction - Оригинальная функция рендеринга
     * @returns {Function} - Обёрнутая функция
     */
    wrapRenderFunction(renderFunction) {
        return function(row, col, cell) {
            // Вызываем оригинальную функцию
            renderFunction(row, col, cell);
            
            // Применяем подсветку
            if (window.moveHighlight && window.moveHighlight.enabled) {
                window.moveHighlight.applyHighlight(cell, row, col);
            }
        };
    }
    
    // === СОБЫТИЯ ===
    
    /**
     * Добавляет слушатель событий
     * @param {string} event - Имя события ('update', 'clear')
     * @param {Function} callback - Функция обратного вызова
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    /**
     * Удаляет слушатель событий
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    
    /**
     * Уведомляет слушателей о событии
     */
    notifyListeners(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Ошибка в слушателе события "${event}":`, error);
            }
        });
    }
    
    // === УТИЛИТЫ ===
    
    /**
     * Включает/выключает подсветку
     * @param {boolean} enabled - Включена ли подсветка
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clearAllHighlights();
        }
        console.log(`🎯 Подсветка ${enabled ? 'включена' : 'выключена'}`);
    }
    
    /**
     * Получает классы для подсветки
     * @returns {Object} - { fromClass, toClass }
     */
    getHighlightClasses() {
        return {
            fromClass: this.highlightClassFrom,
            toClass: this.highlightClassTo
        };
    }
    
    /**
     * Создаёт объект для отправки на сервер
     * @returns {Object} - Данные о ходе
     */
    toMoveData() {
        if (!this.hasLastMove()) return null;
        return {
            from: { ...this.lastMove.from },
            to: { ...this.lastMove.to }
        };
    }
    
    /**
     * Форматирует ход для отображения
     * @param {Object} move - Данные хода
     * @returns {string} - Отформатированная строка
     */
    formatMove(move) {
        if (!move) return '—';
        const from = move.from || move;
        const to = move.to || move;
        return `${String.fromCharCode(65 + from.col)}${8 - from.row} → ${String.fromCharCode(65 + to.col)}${8 - to.row}`;
    }
    
    /**
     * Уничтожает модуль
     */
    destroy() {
        this.clearLastMove();
        this.clearAllHighlights();
        this.listeners = [];
        this.enabled = false;
        console.log('🎯 Модуль подсветки ходов уничтожен');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

// Создаём глобальный экземпляр
let moveHighlight = null;

function initMoveHighlight() {
    if (!moveHighlight) {
        moveHighlight = new MoveHighlight();
        window.moveHighlight = moveHighlight;
        console.log('✅ MoveHighlight инициализирован');
    }
    return moveHighlight;
}

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMoveHighlight);
} else {
    initMoveHighlight();
}

// Экспорт для модульной системы
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MoveHighlight, initMoveHighlight, moveHighlight };
}