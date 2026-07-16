// static/js/features/chessRules.js

class ChessRules {
    constructor() {
        this.isEnabled = true;
        this.currentColor = 'white';
        this.lastFEN = '';
    }
    
    // Установить цвет текущего игрока
    setCurrentColor(color) {
        this.currentColor = color;
    }
    
    // Создать временную игру для проверки
    createTempGame(board) {
        const game = new Chess();
        const fen = this.boardToFEN(board);
        try {
            game.load(fen);
            return game;
        } catch (error) {
            console.error('❌ Ошибка загрузки FEN:', error);
            return null;
        }
    }
    
    // Преобразовать доску в FEN (упрощённо, без учёта очереди хода)
    boardToFEN(board) {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    fen += piece;
                } else {
                    empty++;
                }
            }
            if (empty > 0) fen += empty;
            if (r < 7) fen += '/';
        }
        // Добавляем информацию о том, чей ход
        const turn = this.currentColor === 'white' ? 'w' : 'b';
        fen += ` ${turn} - - 0 1`;
        return fen;
    }
    
    // Проверить ход
    isValidMove(fromRow, fromCol, toRow, toCol, board, color) {
        if (!this.isEnabled) return true;
        
        try {
            const playerColor = color || this.currentColor || 'white';
            
            // Проверяем, что фигура принадлежит текущему игроку
            const piece = board[fromRow]?.[fromCol];
            if (!piece) return false;
            
            const isWhite = piece === piece.toUpperCase();
            const playerIsWhite = playerColor === 'white';
            
            if ((isWhite && !playerIsWhite) || (!isWhite && playerIsWhite)) {
                console.log(`❌ Не ваша фигура! (${piece} для ${playerColor})`);
                return false;
            }
            
            // Создаём временную игру
            const game = this.createTempGame(board);
            if (!game) return false;
            
            const from = this.toAlgebraic(fromRow, fromCol);
            const to = this.toAlgebraic(toRow, toCol);
            
            // Получаем все легальные ходы
            const moves = game.moves({ verbose: true });
            
            // Проверяем, есть ли ход в списке легальных
            const isValid = moves.some(m => m.from === from && m.to === to);
            
            if (!isValid) {
                console.log(`❌ Недопустимый ход: ${from} → ${to}`);
                console.log(`   Легальные ходы:`, moves.map(m => `${m.from}→${m.to}`).slice(0, 5));
            }
            
            return isValid;
        } catch (error) {
            console.error('❌ Ошибка проверки хода:', error);
            return false;
        }
    }
    
    // Получить все легальные ходы для клетки
    getLegalMoves(row, col, board, color) {
        if (!this.isEnabled) return [];
        
        try {
            const playerColor = color || this.currentColor || 'white';
            const game = this.createTempGame(board);
            if (!game) return [];
            
            const from = this.toAlgebraic(row, col);
            const moves = game.moves({ verbose: true });
            
            return moves
                .filter(m => m.from === from)
                .map(m => this.fromAlgebraic(m.to));
        } catch (error) {
            console.error('❌ Ошибка получения ходов:', error);
            return [];
        }
    }
    
    // Проверить шах
    isInCheck(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_check() : false;
        } catch (error) {
            return false;
        }
    }
    
    // Проверить мат
    isCheckmate(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_checkmate() : false;
        } catch (error) {
            return false;
        }
    }
    
    // Проверить пат
    isStalemate(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_stalemate() : false;
        } catch (error) {
            return false;
        }
    }
    
    // Проверить ничью
    isDraw(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_draw() : false;
        } catch (error) {
            return false;
        }
    }
    
    // Конвертация: row, col → 'e4'
    toAlgebraic(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }
    
    // Конвертация: 'e4' → { row, col }
    fromAlgebraic(square) {
        const col = square.charCodeAt(0) - 97;
        const row = 8 - parseInt(square[1]);
        return { row, col };
    }
    
    // Установить режим (включить/выключить правила)
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`♟️ Правила ${enabled ? 'включены' : 'выключены'}`);
        if (typeof showToast === 'function') {
            showToast(enabled ? '✅ Правила включены' : '⛔ Правила выключены', 'info');
        }
    }
}

// Создаём глобальный экземпляр
const chessRules = new ChessRules();
window.chessRules = chessRules;

console.log('♟️ ChessRules загружен!');