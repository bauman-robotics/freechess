// static/js/features/chessRules.js

class ChessRules {
    constructor() {
        this.isEnabled = true;
        this.currentColor = 'white';
        this.moveHistory = [];
    }
    
    setCurrentColor(color) {
        this.currentColor = color;
    }
    
    createTempGame(board) {
        try {
            const game = new Chess();
            const fen = this.boardToFEN(board);
            game.load(fen);
            return game;
        } catch (error) {
            console.error('❌ Ошибка загрузки FEN:', error);
            return null;
        }
    }
    
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
        const turn = this.currentColor === 'white' ? 'w' : 'b';
        const castling = this.getCastlingRights(board);
        fen += ` ${turn} ${castling} - 0 1`;
        return fen;
    }
    
    getCastlingRights(board) {
        let castling = '';
        if (board[7]?.[4] === 'K') {
            if (board[7]?.[7] === 'R') castling += 'K';
            if (board[7]?.[0] === 'R') castling += 'Q';
        }
        if (board[0]?.[4] === 'k') {
            if (board[0]?.[7] === 'r') castling += 'k';
            if (board[0]?.[0] === 'r') castling += 'q';
        }
        return castling || '-';
    }
    
    FENtoBoard(fen) {
        const board = [];
        const rows = fen.split(' ')[0].split('/');
        for (let r = 0; r < 8; r++) {
            board[r] = [];
            let c = 0;
            for (let i = 0; i < rows[r].length; i++) {
                const char = rows[r][i];
                if (isNaN(char)) {
                    board[r][c] = char;
                    c++;
                } else {
                    const empty = parseInt(char);
                    for (let e = 0; e < empty; e++) {
                        board[r][c] = null;
                        c++;
                    }
                }
            }
        }
        return board;
    }
    
    // ============================================
    // ИСТОРИЯ ХОДОВ
    // ============================================
    
    addMoveToHistory(move) {
        console.log(`📝 Добавление хода в историю:`, {
            piece: move.piece,
            from: move.from,
            to: move.to,
            isCastling: move.isCastling
        });
        
        this.moveHistory.push({
            piece: move.piece,
            from: move.from,
            to: move.to,
            isCastling: move.isCastling || false,
            promotion: move.promotion || null
        });
        
        if (this.moveHistory.length > 200) {
            this.moveHistory = this.moveHistory.slice(-200);
        }
    }
    
    clearHistory() {
        this.moveHistory = [];
        console.log('♟️ История chessRules очищена');
    }
    
    // ============================================
    // ПРОВЕРКИ ДЛЯ РОКИРОВКИ
    // ============================================
    
    hasKingMoved(isWhite) {
        const king = isWhite ? 'K' : 'k';
        
        for (const entry of this.moveHistory) {
            if (entry.piece === king) {
                return true;
            }
            if (entry.isCastling) {
                const entryIsWhite = entry.piece === 'K';
                if (entryIsWhite === isWhite) {
                    return true;
                }
            }
        }
        return false;
    }
    
    hasRookMoved(isWhite, isKingside) {
        const rook = isWhite ? 'R' : 'r';
        const startRow = isWhite ? 7 : 0;
        const startCol = isKingside ? 7 : 0;
        
        console.log(`🔍 Проверка ходов ладьи: ищем ${rook} с (${startRow},${startCol})`);
        
        for (const entry of this.moveHistory) {
            if (entry.piece === rook) {
                console.log(`   Проверяем: ${entry.piece} from(${entry.from.row},${entry.from.col})`);
                if (entry.from.row === startRow && entry.from.col === startCol) {
                    console.log(`   ❌ Ладья ходила!`);
                    return true;
                }
            }
        }
        console.log(`   ✅ Ладья не ходила`);
        return false;
    }
    
    // ============================================
    // ПРОВЕРКА РОКИРОВКИ
    // ============================================
    
    isValidCastling(fromRow, fromCol, toRow, toCol, board, color) {
        if (!this.isEnabled) return true;
        
        try {
            const piece = board[fromRow]?.[fromCol];
            
            if (!piece || (piece !== 'K' && piece !== 'k')) {
                if (typeof showToast === 'function') {
                    showToast('❌ Рокировка возможна только королём', 'error');
                }
                return false;
            }
            
            const isWhite = piece === 'K';
            const row = isWhite ? 7 : 0;
            
            if (fromRow !== row || fromCol !== 4) {
                if (typeof showToast === 'function') {
                    showToast('❌ Король не на своей начальной позиции', 'error');
                }
                return false;
            }
            
            if (this.hasKingMoved(isWhite)) {
                console.log('❌ Король уже ходил');
                if (typeof showToast === 'function') {
                    showToast('❌ Король уже ходил, рокировка невозможна', 'error');
                }
                return false;
            }
            
            const isKingside = toCol > fromCol;
            const rookCol = isKingside ? 7 : 0;
            const rook = isWhite ? 'R' : 'r';
            
            if (board[row][rookCol] !== rook) {
                if (typeof showToast === 'function') {
                    showToast('❌ Ладья не на своей позиции', 'error');
                }
                return false;
            }
            
            if (this.hasRookMoved(isWhite, isKingside)) {
                if (typeof showToast === 'function') {
                    showToast('❌ Ладья уже ходила, рокировка невозможна', 'error');
                }
                return false;
            }
            
            const betweenCols = isKingside ? [5, 6] : [1, 2, 3];
            for (const col of betweenCols) {
                if (board[row][col] !== null) {
                    if (typeof showToast === 'function') {
                        showToast('❌ Путь для рокировки заблокирован', 'error');
                    }
                    return false;
                }
            }
            
            // Проверка через chess.js
            const game = this.createTempGame(board);
            if (!game) return false;
            
            const moves = game.moves({ verbose: true });
            const hasCastling = moves.some(m => m.san === 'O-O' || m.san === 'O-O-O');
            
            if (!hasCastling) {
                if (typeof showToast === 'function') {
                    showToast('❌ Рокировка невозможна (шах или битое поле)', 'error');
                }
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка проверки рокировки:', error);
            return false;
        }
    }
    
    // ============================================
    // ВЫПОЛНЕНИЕ РОКИРОВКИ
    // ============================================
    
    makeCastling(fromRow, fromCol, toRow, toCol, board, color) {
        const isWhite = color === 'white';
        const row = isWhite ? 7 : 0;
        const king = isWhite ? 'K' : 'k';
        const rook = isWhite ? 'R' : 'r';
        
        const newBoard = board.map(row => [...row]);
        
        if (toCol > fromCol) {
            newBoard[row][6] = king;
            newBoard[row][4] = null;
            newBoard[row][5] = rook;
            newBoard[row][7] = null;
        } else {
            newBoard[row][2] = king;
            newBoard[row][4] = null;
            newBoard[row][3] = rook;
            newBoard[row][0] = null;
        }
        
        this.addMoveToHistory({
            piece: king,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            isCastling: true
        });
        
        return newBoard;
    }
    
    // ============================================
    // ВЫПОЛНЕНИЕ ОБЫЧНОГО ХОДА
    // ============================================
    
    makeMove(fromRow, fromCol, toRow, toCol, board, color, promotion) {
        if (!this.isEnabled) return null;
        
        try {
            const playerColor = color || this.currentColor || 'white';
            const piece = board[fromRow]?.[fromCol];
            
            if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
                return this.makeCastling(fromRow, fromCol, toRow, toCol, board, playerColor);
            }
            
            const game = this.createTempGame(board);
            if (!game) return null;
            
            const from = this.toAlgebraic(fromRow, fromCol);
            const to = this.toAlgebraic(toRow, toCol);
            
            const moveData = { from: from, to: to };
            if (promotion) {
                moveData.promotion = promotion;
            }
            
            const result = game.move(moveData);
            if (!result) return null;
            
            this.addMoveToHistory({
                piece: piece,
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                isCastling: false,
                promotion: promotion || null
            });
            
            return this.FENtoBoard(game.fen());
        } catch (error) {
            console.error('❌ Ошибка выполнения хода:', error);
            return null;
        }
    }
    
    // ============================================
    // ПРОВЕРКА ХОДА
    // ============================================
    
    isValidMove(fromRow, fromCol, toRow, toCol, board, color) {
        if (!this.isEnabled) return true;
        
        try {
            const playerColor = color || this.currentColor || 'white';
            const piece = board[fromRow]?.[fromCol];
            if (!piece) return false;
            
            const isWhite = piece === piece.toUpperCase();
            const playerIsWhite = playerColor === 'white';
            
            if ((isWhite && !playerIsWhite) || (!isWhite && playerIsWhite)) {
                return false;
            }
            
            const targetPiece = board[toRow]?.[toCol];
            if (targetPiece && (targetPiece === 'K' || targetPiece === 'k')) {
                console.log('❌ Нельзя съесть короля!');
                if (typeof showToast === 'function') {
                    showToast('❌ Нельзя съесть короля!', 'error');
                }
                return false;
            }
            
            if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
                return this.isValidCastling(fromRow, fromCol, toRow, toCol, board, playerColor);
            }
            
            const game = this.createTempGame(board);
            if (!game) return false;
            
            const from = this.toAlgebraic(fromRow, fromCol);
            const to = this.toAlgebraic(toRow, toCol);
            
            const moves = game.moves({ verbose: true });
            const isValid = moves.some(m => m.from === from && m.to === to);
            
            if (!isValid) {
                console.log(`❌ Недопустимый ход: ${from} → ${to}`);
            }
            
            return isValid;
        } catch (error) {
            console.error('❌ Ошибка проверки хода:', error);
            return false;
        }
    }
    
    // ============================================
    // ПРОВЕРКИ ШАХА, МАТА
    // ============================================
    
    isInCheck(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_check() : false;
        } catch (error) {
            return false;
        }
    }
    
    isCheckmate(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_checkmate() : false;
        } catch (error) {
            return false;
        }
    }
    
    isStalemate(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_stalemate() : false;
        } catch (error) {
            return false;
        }
    }
    
    isDraw(board) {
        if (!this.isEnabled) return false;
        try {
            const game = this.createTempGame(board);
            return game ? game.in_draw() : false;
        } catch (error) {
            return false;
        }
    }
    
    // ============================================
    // УТИЛИТЫ
    // ============================================
    
    toAlgebraic(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }
    
    fromAlgebraic(square) {
        const col = square.charCodeAt(0) - 97;
        const row = 8 - parseInt(square[1]);
        return { row, col };
    }
    
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`♟️ Правила ${enabled ? 'включены' : 'выключены'}`);
        if (typeof showToast === 'function') {
            showToast(enabled ? '✅ Правила включены' : '⛔ Правила выключены', 'info');
        }
    }
    
    // ============================================
    // СИНХРОНИЗАЦИЯ ИСТОРИИ С СЕРВЕРА
    // ============================================
    syncHistoryFromServer(moveHistory) {
        this.clearHistory();
        
        console.log('🔄 Синхронизация истории с сервера (UCI):', moveHistory);
        
        // Создаём копию доски для отслеживания фигур
        let tempBoard = board.map(row => [...row]);
        
        for (const moveStr of moveHistory) {
            let from = { row: -1, col: -1 };
            let to = { row: -1, col: -1 };
            let isCastling = false;
            let piece = 'P';
            
            // Рокировка
            if (moveStr === 'O-O' || moveStr === 'O-O-O') {
                isCastling = true;
                piece = 'K';
                const isWhite = this.moveHistory.length % 2 === 0;
                const row = isWhite ? 7 : 0;
                from = { row: row, col: 4 };
                to = { row: row, col: moveStr === 'O-O' ? 6 : 2 };
                
                // Обновляем доску для рокировки
                const king = isWhite ? 'K' : 'k';
                const rook = isWhite ? 'R' : 'r';
                const rookFromCol = moveStr === 'O-O' ? 7 : 0;
                const rookToCol = moveStr === 'O-O' ? 5 : 3;
                
                tempBoard[to.row][to.col] = king;
                tempBoard[from.row][from.col] = null;
                tempBoard[row][rookToCol] = rook;
                tempBoard[row][rookFromCol] = null;
                
                this.addMoveToHistory({
                    piece: piece,
                    from: from,
                    to: to,
                    isCastling: isCastling
                });
                continue;
            }
            
            // UCI формат: "h1g1" или "e2e4"
            if (moveStr.length >= 4) {
                const fromSquare = moveStr.substring(0, 2);
                const toSquare = moveStr.substring(2, 4);
                
                from = this.fromAlgebraic(fromSquare);
                to = this.fromAlgebraic(toSquare);
                
                // ============================================
                // ⚡ ОПРЕДЕЛЯЕМ ФИГУРУ ПО ДОСКЕ!
                // ============================================
                const tempPiece = tempBoard[from.row]?.[from.col];
                if (tempPiece) {
                    piece = tempPiece;
                    console.log(`   ✅ ${fromSquare} → ${toSquare}: ${piece}`);
                } else {
                    console.warn(`   ⚠️ Нет фигуры на ${fromSquare} для хода ${moveStr}`);
                    piece = 'P';
                }
                
                // Обновляем доску (перемещаем фигуру)
                if (tempPiece) {
                    // Проверяем превращение
                    const isPromotion = moveStr.length === 5;
                    if (isPromotion) {
                        const promoChar = moveStr.charAt(4);
                        const isWhite = tempPiece === tempPiece.toUpperCase();
                        const promoMap = {
                            'q': isWhite ? 'Q' : 'q',
                            'r': isWhite ? 'R' : 'r',
                            'b': isWhite ? 'B' : 'b',
                            'n': isWhite ? 'N' : 'n'
                        };
                        tempBoard[to.row][to.col] = promoMap[promoChar] || tempPiece;
                    } else {
                        tempBoard[to.row][to.col] = tempPiece;
                    }
                    tempBoard[from.row][from.col] = null;
                }
            }
            
            this.addMoveToHistory({
                piece: piece,
                from: from,
                to: to,
                isCastling: isCastling
            });
        }
        
        console.log(`♟️ История синхронизирована: ${moveHistory.length} ходов`);
        console.log('📜 Текущая история:', this.moveHistory);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

const chessRules = new ChessRules();
window.chessRules = chessRules;

console.log('♟️ ChessRules загружен');