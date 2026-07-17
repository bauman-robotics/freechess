// static/js/features/chessRules.js

class ChessRules {
    constructor() {
        this.isEnabled = true;
        this.currentColor = 'white';
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
    
    // === РУЧНАЯ ПРОВЕРКА РОКИРОВКИ ===
    isValidCastling(fromRow, fromCol, toRow, toCol, board, color) {
        const isWhite = color === 'white';
        const row = isWhite ? 7 : 0;
        
        // Проверяем, что король на правильной клетке
        if (fromRow !== row || fromCol !== 4) return false;
        if (toRow !== row) return false;
        
        const king = isWhite ? 'K' : 'k';
        const rook = isWhite ? 'R' : 'r';
        
        // Проверяем, что это король
        if (board[fromRow][fromCol] !== king) return false;
        
        // Короткая рокировка (король идёт вправо)
        if (toCol === 6) {
            if (board[row][7] !== rook) return false;
            if (board[row][5] !== null || board[row][6] !== null) return false;
            return true;
        }
        
        // Длинная рокировка (король идёт влево)
        if (toCol === 2) {
            if (board[row][0] !== rook) return false;
            if (board[row][1] !== null || board[row][2] !== null || board[row][3] !== null) return false;
            return true;
        }
        
        return false;
    }
    
    // === РУЧНОЕ ВЫПОЛНЕНИЕ РОКИРОВКИ ===
    makeCastling(fromRow, fromCol, toRow, toCol, board, color) {
        console.log('🔧 makeCastling вызван:', { fromRow, fromCol, toRow, toCol, color });

        const isWhite = color === 'white';
        const row = isWhite ? 7 : 0;
        const king = isWhite ? 'K' : 'k';
        const rook = isWhite ? 'R' : 'r';

        // ✅ КОПИРУЕМ ДОСКУ
        const newBoard = board.map(row => [...row]);

        console.log('Доска ДО:');
        console.log(newBoard.map(row => row.map(c => c || '.').join(' ')).join('\n'));

        // Короткая рокировка (O-O)
        if (toCol > fromCol) {
            console.log('♟️ Короткая рокировка (O-O)');
            newBoard[row][6] = king;    // король на g1
            newBoard[row][4] = null;    // e1 пусто
            newBoard[row][5] = rook;    // ладья на f1
            newBoard[row][7] = null;    // h1 пусто
        }
        // Длинная рокировка (O-O-O)
        else {
            console.log('♟️ Длинная рокировка (O-O-O)');
            newBoard[row][2] = king;    // король на c1
            newBoard[row][4] = null;    // e1 пусто
            newBoard[row][3] = rook;    // ладья на d1  <--- ЗДЕСЬ БЫЛА ОШИБКА?
            newBoard[row][0] = null;    // a1 пусто
        }

        console.log('Доска ПОСЛЕ:');
        console.log(newBoard.map(row => row.map(c => c || '.').join(' ')).join('\n'));

        return newBoard;
    }
        
    makeMove(fromRow, fromCol, toRow, toCol, board, color) {
        if (!this.isEnabled) return null;
        
        try {
            const playerColor = color || this.currentColor || 'white';
            const piece = board[fromRow]?.[fromCol];
            
            // === ПРОВЕРКА РОКИРОВКИ ===
            if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
                return this.makeCastling(fromRow, fromCol, toRow, toCol, board, playerColor);
            }
            
            const game = this.createTempGame(board);
            if (!game) return null;
            
            const from = this.toAlgebraic(fromRow, fromCol);
            const to = this.toAlgebraic(toRow, toCol);
            
            const move = game.move({ from: from, to: to });
            if (!move) return null;
            
            return this.FENtoBoard(game.fen());
        } catch (error) {
            console.error('❌ Ошибка выполнения хода:', error);
            return null;
        }
    }
    
    isValidMove(fromRow, fromCol, toRow, toCol, board, color) {
        // Если правила выключены — ВСЕ ходы разрешены
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
            
            // ============================================
            // ⚡ КРИТИЧЕСКАЯ ПРОВЕРКА: Нельзя съесть короля!
            // ============================================
            const targetPiece = board[toRow]?.[toCol];
            if (targetPiece && (targetPiece === 'K' || targetPiece === 'k')) {
                console.log('❌ Нельзя съесть короля! (правила включены)');
                if (typeof showToast === 'function') {
                    showToast('❌ Нельзя съесть короля! (правила включены)', 'error');
                }
                return false;
            }
            
            // === ПРОВЕРКА РОКИРОВКИ ===
            if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
                return this.isValidCastling(fromRow, fromCol, toRow, toCol, board, playerColor);
            }
            
            // === ПРОВЕРКА ЧЕРЕЗ chess.js ===
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
}

const chessRules = new ChessRules();
window.chessRules = chessRules;

console.log('♟️ ChessRules загружен с ручной рокировкой!');