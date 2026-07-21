// static/js/features/gameModes.js
// ============================================
// МОДУЛЬ РЕЖИМОВ ИГРЫ
// ============================================
// Отвечает за:
// - Управление 4 режимами игры (radiobutton группа)
// - Проверку очередности ходов
// - Марсельские шахматы (игра в два хода)
// - Валидацию правил для каждого режима
// ============================================

class GameModes {
    constructor() {
        // Доступные режимы
        this.MODES = {
            CLASSIC: 'classic',           // Общие правила с очередью
            MARSEILLE: 'marseille',       // Марсельские шахматы (2 хода)
            NO_TURN: 'no_turn',           // Без очереди, но с правилами
            NO_RULES: 'no_rules'          // Без правил
        };
        
        // Текущий режим (по умолчанию - общие правила)
        this.currentMode = this.MODES.CLASSIC;
        this.listeners = {};
        
        // Состояние для режима "Марсельские шахматы"
        this.marseilleState = {
            currentTurn: 'white',          // Кто ходит в текущем turn
            moveCount: 0,                  // Сколько ходов сделано в текущем turn (0, 1, 2)
            checkDeclared: false,          // Был ли объявлен шах первым ходом
            mustParryCheck: false,         // Нужно ли парировать шах
            lastMovedPiece: null,          // Фигура, которой ходили в этом turn
            lastMovedTo: null,  
            whiteFirstMoveDone: false      // Белые сделали первый ход (только 1 ход)
        };
        
        console.log('🎮 Модуль режимов игры инициализирован');
    }
    
    // ============================================
    // МАРСЕЛЬСКИЕ ШАХМАТЫ
    // ============================================
    
    /**
     * Инициализирует состояние Марсельских шахмат
     */
    initMarseille() {
        // Получаем настройки из конфига
        const config = window.CONFIG?.MARSEILLE || {};
        const whiteStartsWithOneMove = config.WHITE_STARTS_WITH_ONE_MOVE ?? true;
        
        this.marseilleState = {
            currentTurn: 'white',
            moveCount: 0,
            checkDeclared: false,
            mustParryCheck: false,
            lastMovedPiece: null,
            lastMovedTo: null,  
            whiteFirstMoveDone: false,
            // Сохраняем настройки в состоянии для быстрого доступа
            config: {
                disableSamePieceTwice: config.DISABLE_SAME_PIECE_TWICE ?? true,
                whiteStartsWithOneMove: whiteStartsWithOneMove,
                loseSecondMoveOnCheck: config.LOSE_SECOND_MOVE_ON_CHECK ?? true
            }
        };
        console.log('♟️ Марсельские шахматы инициализированы с настройками:', this.marseilleState.config);
    }
    

    // ============================================
    // ВАЛИДАЦИЯ ХОДА ДЛЯ МАРСЕЛЬСКИХ ШАХМАТ
    // ============================================

    /**
     * Проверяет, может ли игрок сделать ход в Марсельских шахматах
     * @param {string} color - Цвет игрока
     * @param {Object} from - { row, col }
     * @param {Array} board - Доска
     * @returns {Object} - { valid: boolean, reason: string }
     */
    validateMarseilleMove(color, from, board) {
        const state = this.marseilleState;
        
        console.log(`♟️ Марсельские: validateMarseilleMove() - color=${color}, currentTurn=${state.currentTurn}, moveCount=${state.moveCount}`);
        
        // === ПРОВЕРКА 1: Белые делают только 1 ход ===
        if (!state.whiteFirstMoveDone) {
            if (color !== 'white') {
                return { valid: false, reason: '⏳ Белые должны сделать первый ход' };
            }
            return { valid: true };
        }
        
        // === ПРОВЕРКА 2: Если под шахом, обязательно парировать ===
        if (state.mustParryCheck) {
            if (color !== state.currentTurn) {
                return { 
                    valid: false, 
                    reason: `⏳ ${state.currentTurn === 'white' ? 'Белые' : 'Чёрные'} должны парировать шах!` 
                };
            }
            return { valid: true };
        }
        
        // === ПРОВЕРКА 3: Не прошло ли 2 хода ===
        if (state.moveCount >= 2) {
            const currentPlayer = state.currentTurn === 'white' ? 'Белые' : 'Чёрные';
            return { 
                valid: false, 
                reason: `⏳ ${currentPlayer} уже сделали два хода` 
            };
        }
        
        // === ПРОВЕРКА 4: Ходит ли правильный игрок ===
        if (color !== state.currentTurn) {
            const currentPlayer = state.currentTurn === 'white' ? 'белых' : 'чёрных';
            return { 
                valid: false, 
                reason: `⏳ Сейчас ход ${currentPlayer}` 
            };
        }
        
        // ============================================
        // ⚡ ПРОВЕРКА 5: Запрет на движение одной фигурой дважды
        // (опционально, определяется в конфиге)
        // ============================================
        const disableSamePieceTwice = window.CONFIG?.MARSEILLE?.DISABLE_SAME_PIECE_TWICE ?? true;
        
        // Проверяем: если включен запрет, есть информация о последней фигуре,
        // и фигура на доске совпадает с последней фигурой и стоит на той же клетке
        if (disableSamePieceTwice && state.lastMovedPiece && state.lastMovedTo) {
            const currentPiece = board[from.row]?.[from.col];
            const isSamePiece = currentPiece === state.lastMovedPiece;
            const isSamePosition = from.row === state.lastMovedTo.row && 
                                  from.col === state.lastMovedTo.col;
            
            console.log('🔍 ПРОВЕРКА ЗАПРЕТА (новая):');
            console.log('  state.lastMovedPiece:', state.lastMovedPiece);
            console.log('  state.lastMovedTo:', state.lastMovedTo);
            console.log('  from:', from);
            console.log('  currentPiece:', currentPiece);
            console.log('  isSamePiece:', isSamePiece);
            console.log('  isSamePosition:', isSamePosition);
            
            // Запрещаем ход, если это та же фигура и она стоит на той же клетке
            if (isSamePiece && isSamePosition) {
                console.log('❌ ЗАПРЕТ СРАБОТАЛ!');
                return { 
                    valid: false, 
                    reason: '❌ Нельзя ходить одной фигурой дважды за ход!' 
                };
            }
        }
        
        return { valid: true };
    }

    /**
     * Сбрасывает состояние Марсельских шахмат
     */
    resetMarseilleState() {
        this.marseilleState = {
            currentTurn: 'white',
            moveCount: 0,
            checkDeclared: false,
            mustParryCheck: false,
            lastMovedPiece: null,
            lastMovedTo: null, 
            whiteFirstMoveDone: false
        };
    }
    
    // ============================================
    // ОЧЕРЕДНОСТЬ ХОДА ДЛЯ МАРСЕЛЬСКИХ ШАХМАТ
    // ============================================
    
    /**
     * Возвращает текущего игрока для хода в Марсельских шахматах
     * @param {string} color - Цвет игрока
     * @returns {string} - 'white' или 'black'
     */
    getMarseilleTurn(color) {
        const state = this.marseilleState;
        
        console.log(`♟️ Марсельские: getMarseilleTurn() - currentTurn=${state.currentTurn}, moveCount=${state.moveCount}, whiteFirstMoveDone=${state.whiteFirstMoveDone}`);
        
        // === ПРАВИЛО 1: Белые начинают с ОДНОГО хода ===
        if (!state.whiteFirstMoveDone) {
            console.log('♟️ Белые делают первый (единственный) ход');
            return 'white';
        }
        
        // === ПРАВИЛО 2: Если нужно парировать шах ===
        if (state.mustParryCheck) {
            console.log(`♟️ Нужно парировать шах, ходит ${state.currentTurn}`);
            return state.currentTurn;
        }
        
        // === ПРАВИЛО 3: Если сделано 2 хода, переключаем игрока ===
        if (state.moveCount >= 2) {
            const newTurn = state.currentTurn === 'white' ? 'black' : 'white';
            state.currentTurn = newTurn;
            state.moveCount = 0;
            state.lastMovedPiece = null;
            state.lastMovedTo = null;
            state.checkDeclared = false;
            console.log(`♟️ Марсельские: смена хода на ${newTurn}`);
            return newTurn;
        }
        
        // === ПРАВИЛО 4: Текущий игрок продолжает ход ===
        console.log(`♟️ Марсельские: продолжает ход ${state.currentTurn}`);
        return state.currentTurn;
    }
    
    /**
     * Обрабатывает ход в Марсельских шахматах
     */
    processMarseilleMove(moveData, color, board, boardBefore) {
        const state = this.marseilleState;
        const config = state.config || { whiteStartsWithOneMove: true, loseSecondMoveOnCheck: true };
        
        // ============================================
        // ⚡ ОТЛАДКА: ПРОВЕРЯЕМ ВХОДНЫЕ ДАННЫЕ
        // ============================================
        console.log('🔥🔥🔥 processMarseilleMove ВЫЗВАН');
        console.log('  color:', color);
        console.log('  moveData:', moveData);
        console.log('  moveData.piece:', moveData?.piece);
        console.log('  moveData.fromRow:', moveData?.fromRow);
        console.log('  moveData.fromCol:', moveData?.fromCol);
        console.log('  state.whiteFirstMoveDone:', state.whiteFirstMoveDone);
        console.log('  config.whiteStartsWithOneMove:', config.whiteStartsWithOneMove);

        console.log(`♟️ Марсельские: processMarseilleMove() - color=${color}, currentTurn=${state.currentTurn}, moveCount=${state.moveCount}`);
        console.log(`♟️ boardBefore:`, boardBefore);
        console.log(`♟️ boardAfter:`, board);
        
        // === СЛУЧАЙ 1: Белые делают первый ход ===
        if (config.whiteStartsWithOneMove && !state.whiteFirstMoveDone && color === 'white') {
            // ✅ СОХРАНЯЕМ ИНФОРМАЦИЮ О ФИГУРЕ И КЛЕТКЕ, КУДА ПОСТАВИЛИ
            state.lastMovedPiece = moveData.piece;
            state.lastMovedTo = { row: moveData.toRow, col: moveData.toCol };  // ✅ ИЗМЕНЕНО
            
            state.whiteFirstMoveDone = true;
            state.moveCount = 0;
            state.currentTurn = 'black';
            console.log('♟️ Белые сделали первый ход, теперь ход чёрных');
            console.log('  lastMovedPiece:', state.lastMovedPiece);
            console.log('  lastMovedTo:', state.lastMovedTo);
            return;
        }
        
        // Если whiteStartsWithOneMove = false, белые ходят как все (2 хода)
        if (!config.whiteStartsWithOneMove && !state.whiteFirstMoveDone && color === 'white') {
            state.whiteFirstMoveDone = true;
            console.log('♟️ Белые начали игру, ходят как все (2 хода)');
        }
        
        // === СЛУЧАЙ 2: Проверяем шах ===
        if (window.chessRules && window.chessRules.isEnabled) {
            let wasCheckBefore = false;
            if (boardBefore) {
                wasCheckBefore = window.chessRules.isInCheck(boardBefore);
            }
            
            const boardAfter = board.map(row => [...row]);
            const isCheckAfter = window.chessRules.isInCheck(boardAfter);
            
            console.log(`♟️ wasCheckBefore=${wasCheckBefore}, isCheckAfter=${isCheckAfter}`);
            
            // === ПРАВИЛО: Если объявлен шах ПЕРВЫМ ходом - игрок теряет второй ход ===
            if (config.loseSecondMoveOnCheck && !wasCheckBefore && isCheckAfter && state.moveCount === 0) {
                state.checkDeclared = true;
                state.currentTurn = state.currentTurn === 'white' ? 'black' : 'white';
                state.moveCount = 0;
                state.lastMovedPiece = null;
                state.lastMovedTo = null; 
                console.log(`♟️ Шах объявлен! ${color} теряет право на второй ход`);
                
                if (window.chessRules.isCheckmate(boardAfter)) {
                    console.log(`♟️ МАТ! ${color === 'white' ? 'Чёрные' : 'Белые'} проиграли!`);
                }
                return;
            }
            
            // === ПРАВИЛО: Если игрок под шахом - он должен парировать ===
            if (isCheckAfter) {
                window.chessRules.setCurrentColor('white');
                const whiteInCheck = window.chessRules.isInCheck(boardAfter);
                const checkColor = whiteInCheck ? 'white' : 'black';
                
                if (checkColor === color) {
                    state.mustParryCheck = true;
                    console.log(`♟️ ${color} под шахом! Нужно парировать следующим ходом`);
                }
            } else {
                state.mustParryCheck = false;
            }
        }
        
        // === СЛУЧАЙ 3: Обычный ход ===
        // Сохраняем информацию о фигуре и клетке, куда поставили
        state.moveCount++;
        state.lastMovedPiece = moveData.piece;
        state.lastMovedTo = { row: moveData.toRow, col: moveData.toCol };  // ✅ ИЗМЕНЕНО

        console.log(`♟️ Марсельские: ${color} сделал ${state.moveCount}-й ход из 2`);
        console.log('  lastMovedPiece:', state.lastMovedPiece);
        console.log('  lastMovedTo:', state.lastMovedTo);

        // === СЛУЧАЙ 4: Если сделано 2 хода, переключаем игрока ===
        if (state.moveCount >= 2) {
            state.currentTurn = state.currentTurn === 'white' ? 'black' : 'white';
            state.moveCount = 0;
            state.lastMovedPiece = null;
            state.lastMovedTo = null;  // ✅ ИЗМЕНЕНО
            console.log(`♟️ Марсельские: смена хода на ${state.currentTurn}`);
        }
    }
    
    // ============================================
    // УПРАВЛЕНИЕ РЕЖИМАМИ
    // ============================================
    
    /**
     * Устанавливает текущий режим
     * @param {string} mode - Один из MODES
     */
    setMode(mode) {
        if (!Object.values(this.MODES).includes(mode)) {
            console.warn(`⚠️ Неизвестный режим: ${mode}`);
            return;
        }
        
        const oldMode = this.currentMode;
        this.currentMode = mode;
        console.log(`🎮 Режим изменён с ${oldMode} на: ${mode}`);
        
        // ПРИНУДИТЕЛЬНЫЙ СБРОС состояния Марсельских шахмат
        if (mode === this.MODES.MARSEILLE) {
            this.initMarseille();
            console.log('♟️ Марсельские шахматы инициализированы (сброс состояния)');
        } else {
            this.resetMarseilleState();
            console.log('♟️ Состояние Марсельских шахмат сброшено');
        }
        
        this.notifyListeners('modeChanged', { mode });
    }
    
    /**
     * Возвращает текущий режим
     * @returns {string}
     */
    getMode() {
        return this.currentMode;
    }
    
    /**
     * Проверяет, включены ли правила в текущем режиме
     * @returns {boolean}
     */
    getEnabled() {
        return this.currentMode !== this.MODES.NO_RULES;
    }
    
    /**
     * Проверяет, нужно ли проверять очередность
     * @returns {boolean}
     */
    hasTurnOrder() {
        return this.currentMode === this.MODES.CLASSIC || 
               this.currentMode === this.MODES.MARSEILLE;
    }
    
    /**
     * Проверяет, является ли режим Марсельскими шахматами
     * @returns {boolean}
     */
    isMarseille() {
        return this.currentMode === this.MODES.MARSEILLE;
    }
    
    // ============================================
    // ОЧЕРЕДНОСТЬ ХОДА
    // ============================================
    
    /**
     * Возвращает текущего игрока для хода
     * @param {string} color - Цвет игрока
     * @returns {string} - 'white' или 'black'
     */
    getCurrentTurn(color) {
        if (!this.hasTurnOrder()) {
            return color;
        }
        
        if (this.isMarseille()) {
            return this.getMarseilleTurn(color);
        }
        
        // Классический режим
        const history = window.moveHistory || [];
        return history.length % 2 === 0 ? 'white' : 'black';
    }
    
    /**
     * Проверяет, может ли игрок ходить
     * @param {string} color - Цвет игрока
     * @param {Array} board - Текущая доска
     * @returns {boolean}
     */
    isMyTurn(color, board) {
        if (!this.hasTurnOrder()) {
            return true;
        }
        
        if (this.isMarseille()) {
            const turn = this.getMarseilleTurn(color);
            console.log(`♟️ isMyTurn: color=${color}, turn=${turn}`);
            return color === turn;
        }
        
        return this.getCurrentTurn(color) === color;
    }
    
    // ============================================
    // ВАЛИДАЦИЯ ХОДА
    // ============================================
    
    /**
     * Проверяет, является ли ход легальным с учётом режима
     * @param {Object} moveData - Данные хода
     * @param {Array} board - Текущая доска
     * @param {string} color - Цвет игрока
     * @returns {Object} - { valid: boolean, reason: string }
     */
    isValidMove(moveData, board, color) {
        if (!moveData || !board) {
            return { valid: false, reason: '❌ Некорректные данные' };
        }
        
        const { fromRow, fromCol, toRow, toCol, piece } = moveData;
        
        if (!piece) {
            return { valid: false, reason: '❌ Нет фигуры на этой клетке' };
        }
        
        // Режим "Без правил"
        if (this.currentMode === this.MODES.NO_RULES) {
            return { valid: true };
        }
        
        // Марсельские шахматы - специальная валидация
        if (this.isMarseille()) {
            const turnValidation = this.validateMarseilleMove(
                color,
                { row: fromRow, col: fromCol },
                board
            );
            if (!turnValidation.valid) {
                return turnValidation;
            }
        }
        
        // Проверка очередности (для классического режима)
        if (this.hasTurnOrder() && !this.isMarseille()) {
            const turn = this.getCurrentTurn(color);
            if (color !== turn) {
                return { 
                    valid: false, 
                    reason: `⏳ Сейчас ход ${turn === 'white' ? 'белых' : 'чёрных'}` 
                };
            }
        }
        
        // Проверка через chessRules
        if (window.chessRules && this.getEnabled()) {
            const isValid = window.chessRules.isValidMove(
                fromRow, fromCol, toRow, toCol, board, color
            );
            if (!isValid) {
                return { valid: false, reason: '❌ Недопустимый ход по правилам' };
            }
        }
        
        return { valid: true };
    }
    
    // ============================================
    // ОБРАБОТКА ХОДА
    // ============================================
    
    /**
     * Обрабатывает ход после его выполнения
     * @param {Object} moveData - Данные хода
     * @param {string} color - Цвет сделавшего ход
     * @param {Array} board - Доска ПОСЛЕ хода
     * @param {Array} boardBefore - Доска ДО хода (опционально)
     */
    processMove(moveData, color, board, boardBefore) {
        if (this.isMarseille()) {
            this.processMarseilleMove(moveData, color, board, boardBefore);
        }
    }
    
    // ============================================
    // НОТАЦИЯ ХОДОВ
    // ============================================
    
    /**
     * Генерирует короткую шахматную нотацию для хода
     * @param {Object} moveData - Данные хода
     * @param {Array} board - Доска до хода
     * @param {string} promotion - Фигура превращения (если есть)
     * @returns {string} - Нотация хода
     */
    getMoveNotation(moveData, board, promotion) {
        const { fromRow, fromCol, toRow, toCol, piece } = moveData;
        
        // Рокировка
        if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
            return toCol > fromCol ? 'O-O' : 'O-O-O';
        }
        
        // Превращение
        if (promotion) {
            const toSquare = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
            const promoChar = promotion.toUpperCase();
            return `${toSquare}=${promoChar}`;
        }
        
        // Обычный ход
        const toSquare = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
        
        // Пешка
        if (piece === 'P' || piece === 'p') {
            const targetPiece = board[toRow]?.[toCol];
            if (targetPiece) {
                const fromFile = String.fromCharCode(97 + fromCol);
                return `${fromFile}x${toSquare}`;
            }
            return toSquare;
        }
        
        // Фигура
        const pieceChar = piece.toUpperCase();
        const targetPiece = board[toRow]?.[toCol];
        const capture = targetPiece ? 'x' : '';
        
        return `${pieceChar}${capture}${toSquare}`;
    }
    
    /**
     * Форматирует историю ходов с учётом режима
     * @param {Array} history - Массив ходов
     * @param {Array} moveDataHistory - Массив данных о ходах
     * @returns {Array} - Отформатированная история
     */
    formatMoveHistory(history, moveDataHistory) {
        if (!history || history.length === 0) {
            return [];
        }
        
        const formatted = [];
        let moveNumber = 1;
        let lastColor = null;
        
        for (let i = 0; i < history.length; i++) {
            const move = history[i];
            const data = moveDataHistory?.[i] || {};
            const color = data.color || (i % 2 === 0 ? 'white' : 'black');
            
            // Марсельские шахматы: белые начинают с одного хода
            if (this.isMarseille()) {
                if (i === 0 && color === 'white') {
                    // Белые ходят один раз
                    formatted.push({
                        number: moveNumber,
                        white: move,
                        black: null,
                        isConsecutive: false
                    });
                    moveNumber++;
                    continue;
                }
            }
            
            // Обычная запись
            if (color === 'white') {
                formatted.push({
                    number: moveNumber,
                    white: move,
                    black: null,
                    isConsecutive: false
                });
                moveNumber++;
            } else {
                if (formatted.length > 0 && formatted[formatted.length - 1].black === null) {
                    formatted[formatted.length - 1].black = move;
                } else {
                    formatted.push({
                        number: moveNumber,
                        white: null,
                        black: move,
                        isConsecutive: false
                    });
                    moveNumber++;
                }
            }
        }
        
        return formatted;
    }
    
    /**
     * Сбрасывает состояние Марсельских шахмат для новой игры
     * (вызывается при загрузке истории или начале новой игры)
     */
    resetMarseilleForNewGame() {
        if (this.isMarseille()) {
            // Сбрасываем состояние, но сохраняем текущий режим
            this.marseilleState = {
                currentTurn: 'white',
                moveCount: 0,
                checkDeclared: false,
                mustParryCheck: false,
                lastMovedPiece: null,
                lastMovedTo: null, 
                whiteFirstMoveDone: false
            };
            console.log('♟️ Состояние Марсельских шахмат сброшено для новой игры');
        }
    }

    /**
     * Восстанавливает состояние Марсельских шахмат из истории ходов
     * @param {Array} history - Массив ходов
     */
    restoreMarseilleStateFromHistory(history) {
        if (!this.isMarseille()) return;
        if (!history || !Array.isArray(history)) {
            console.warn('⚠️ Некорректная история для восстановления');
            return;
        }
        
        const state = this.marseilleState;
        const moveCount = history.length;
        
        console.log(`♟️ Восстановление состояния Марсельских шахмат из ${moveCount} ходов`);
        
        // Если нет ходов - начальное состояние
        if (moveCount === 0) {
            state.whiteFirstMoveDone = false;
            state.currentTurn = 'white';
            state.moveCount = 0;
            // ✅ НЕ обнуляем lastMovedPiece и lastMovedFrom
            state.mustParryCheck = false;
            state.checkDeclared = false;
            console.log('♟️ Начальное состояние (0 ходов)');
            return;
        }
        
        // Белые сделали первый ход
        state.whiteFirstMoveDone = true;
        state.mustParryCheck = false;
        state.checkDeclared = false;
        // ✅ НЕ обнуляем lastMovedPiece и lastMovedFrom
        
        // Если только первый ход белых (1 ход)
        if (moveCount === 1) {
            state.currentTurn = 'black';
            state.moveCount = 0;
            console.log('♟️ После первого хода белых: ход чёрных (0 ходов в текущем turn)');
            return;
        }
        
        // Для остальных случаев:
        // Белые: 1 ход
        // Чёрные: 2 хода
        // Белые: 2 хода
        // Чёрные: 2 хода
        // ...
        const movesAfterFirst = moveCount - 1; // ходы после первого хода белых
        const fullTurns = Math.floor(movesAfterFirst / 2); // полные туры (по 2 хода)
        const remainingMoves = movesAfterFirst % 2; // остаток ходов в текущем туре
        
        // Определяем, кто должен ходить
        if (fullTurns % 2 === 0) {
            // Чётное количество туров - сейчас ходят чёрные
            state.currentTurn = 'black';
        } else {
            // Нечётное количество туров - сейчас ходят белые
            state.currentTurn = 'white';
        }
        
        state.moveCount = remainingMoves;
        
        console.log(`♟️ Восстановлено: currentTurn=${state.currentTurn}, moveCount=${state.moveCount}`);
        console.log(`♟️ fullTurns=${fullTurns}, remainingMoves=${remainingMoves}`);
    }

    // ============================================
    // СОБЫТИЯ
    // ============================================
    
    /**
     * Добавляет слушатель событий
     * @param {string} event - Имя события
     * @param {Function} callback - Функция обратного вызова
     */
    on(event, callback) {
        if (!this.listeners) {
            this.listeners = {};
        }
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
        if (!this.listeners || !this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Ошибка в слушателе ${event}:`, error);
            }
        });
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

const gameModes = new GameModes();
window.gameModes = gameModes;

console.log('🎮 GameModes загружен');