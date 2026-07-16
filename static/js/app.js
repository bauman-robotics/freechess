// static/js/app.js

// Импорты (если используете ES Modules)
import SocketManager from './core/socket.js';
import ChessBoard from './core/board.js';
import ArrowSystem from './features/arrows.js';
import BoardRenderer from './ui/renderer.js';
// ... остальные импорты

// ============================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ============================================

class ChessApp {
    constructor() {
        // Инициализация модулей
        this.socket = SocketManager;
        this.board = new ChessBoard();
        this.arrows = new ArrowSystem(this.socket, this.board);
        this.renderer = new BoardRenderer(this.board, this.arrows);
        
        // Состояние
        this.currentRoom = null;
        this.myName = '';
        this.myColor = null;
        this.players = [];
        this.canUndo = false;
        this.moveHistory = [];
        
        // Настройка обработчиков
        this.renderer.setClickHandler((row, col) => this.onCellClick(row, col));
        this.setupSocketEvents();
        this.setupUIEvents();
        
        // Инициализация доски
        this.board.init();
        this.renderer.render();
        
        // Проверка URL на room
        this.checkUrlParams();
    }
    
    // === ОБРАБОТКА ХОДОВ ===
    
    onCellClick(row, col) {
        if (!this.currentRoom) {
            showToast('Сначала присоединитесь к игре!', 'info');
            return;
        }
        
        const piece = this.board.getPiece(row, col);
        
        if (!this.renderer.selectedCell) {
            if (piece) {
                this.renderer.selectedCell = { row, col };
                this.renderer.render();
                // Обновляем статус
                const pieceName = PIECE_NAMES[piece] || piece;
                const square = `${String.fromCharCode(65 + col)}${8 - row}`;
                setStatus(`Выбрана ${pieceName} (${square})`, 'info-msg');
            }
            return;
        }
        
        // Снятие выбора
        if (this.renderer.selectedCell.row === row && this.renderer.selectedCell.col === col) {
            this.renderer.selectedCell = null;
            this.renderer.render();
            setStatus('Выбор снят', 'info-msg');
            return;
        }
        
        // Выполнение хода
        const fromRow = this.renderer.selectedCell.row;
        const fromCol = this.renderer.selectedCell.col;
        const fromPiece = this.board.getPiece(fromRow, fromCol);
        
        if (fromPiece) {
            const fromName = PIECE_NAMES[fromPiece] || fromPiece;
            const fromSquare = `${String.fromCharCode(65 + fromCol)}${8 - fromRow}`;
            const toSquare = `${String.fromCharCode(65 + col)}${8 - row}`;
            
            // Выполняем ход
            this.board.movePiece(fromRow, fromCol, row, col);
            
            // Отправляем на сервер
            this.socket.emit('move', {
                room_id: this.currentRoom,
                from: { row: fromRow, col: fromCol },
                to: { row: row, col: col }
            });
            
            // Обновляем UI
            const moveStr = `${fromName} ${fromSquare}→${toSquare}`;
            this.moveHistory.push(moveStr);
            document.getElementById('lastMove').textContent = moveStr;
            setStatus(`Ход: ${moveStr}`, 'success');
            
            this.renderer.selectedCell = null;
            this.renderer.render();
        }
    }
    
    // === SOCKET СОБЫТИЯ ===
    
    setupSocketEvents() {
        this.socket.on('joined', (data) => {
            this.currentRoom = data.room_id;
            this.myColor = data.player.color;
            this.players = data.players;
            
            this.board.flipped = (this.myColor === 'black');
            this.canUndo = false;
            updateUndoButton(false);
            
            this.renderer.render();
            this.updateUI();
            
            const colorName = this.myColor === 'white' ? 'белых' : 'черных';
            const colorEmoji = this.myColor === 'white' ? '⚪' : '⚫';
            showToast(`✅ Присоединились к комнате ${this.currentRoom} (${colorEmoji} ${colorName})`, 'success');
            
            // Обновляем URL
            const url = new URL(window.location);
            url.searchParams.set('room', this.currentRoom);
            window.history.pushState({}, '', url);
        });
        
        this.socket.on('board_update', (data) => {
            this.board.board = data.board;
            this.players = data.players || [];
            
            if (data.move) {
                this.board.lastMove.from = data.move.from;
                this.board.lastMove.to = data.move.to;
            }
            
            if (data.can_undo !== undefined) {
                this.canUndo = data.can_undo;
                updateUndoButton(this.canUndo);
            }
            
            // Обновляем стрелки
            if (data.arrows) {
                this.arrows.setArrows(data.arrows);
            }
            
            this.renderer.render();
            this.updateUI();
            
            // Обработка отмены и сброса
            if (data.undo) {
                showToast('↩️ Ход отменён', 'info');
                this.renderer.selectedCell = null;
                if (data.undo_move) {
                    const move = data.undo_move;
                    const pieceName = PIECE_NAMES[move.piece] || move.piece;
                    const fromSquare = `${String.fromCharCode(65 + move.from.col)}${8 - move.from.row}`;
                    const toSquare = `${String.fromCharCode(65 + move.to.col)}${8 - move.to.row}`;
                    document.getElementById('lastMove').textContent = `Отменён: ${pieceName} ${fromSquare}→${toSquare}`;
                    setStatus(`↩️ Отменён ход: ${pieceName} ${fromSquare}→${toSquare}`, 'info-msg');
                }
                this.board.lastMove.from = null;
                this.board.lastMove.to = null;
                this.renderer.render();
            }
            
            if (data.reset) {
                showToast('🔄 Доска сброшена', 'info');
                this.renderer.selectedCell = null;
                this.board.lastMove.from = null;
                this.board.lastMove.to = null;
                this.moveHistory = [];
                document.getElementById('lastMove').textContent = '—';
                this.canUndo = false;
                updateUndoButton(false);
            }
            
            if (data.clear) {
                showToast('🗑️ Доска очищена', 'info');
                this.renderer.selectedCell = null;
                this.board.lastMove.from = null;
                this.board.lastMove.to = null;
                this.moveHistory = [];
                document.getElementById('lastMove').textContent = '—';
                this.canUndo = false;
                updateUndoButton(false);
            }
        });
        
        this.socket.on('error', (data) => {
            showToast(`❌ ${data.message}`, 'error');
            setStatus(`❌ ${data.message}`, 'error');
        });
    }
    
    // === UI ОБНОВЛЕНИЯ ===
    
    updateUI() {
        const playerCount = this.players.length;
        const colorEmoji = this.myColor === 'white' ? '⚪' : this.myColor === 'black' ? '⚫' : '❓';
        const colorName = this.myColor === 'white' ? 'белых' : this.myColor === 'black' ? 'черных' : '—';
        
        document.getElementById('playersDisplay').textContent = `👥 Игроков: ${playerCount}`;
        document.getElementById('colorDisplay').textContent = `${colorEmoji} Вы: ${colorName}`;
        
        // Подсчёт фигур
        let count = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board.getPiece(r, c)) count++;
            }
        }
        document.getElementById('pieceCount').textContent = count;
        
        // Игроки
        if (this.players.length >= 1) {
            document.getElementById('whitePlayer').textContent = this.players[0]?.name || '—';
        }
        if (this.players.length >= 2) {
            document.getElementById('blackPlayer').textContent = this.players[1]?.name || '—';
        }
        
        // Статус
        if (playerCount < 2) {
            setStatus(`⏳ Ожидание игроков... (${playerCount}/2)`, 'info-msg');
        } else {
            setStatus('🎮 Игра активна! Перемещайте фигуры', 'success');
        }
    }
    
    // === СОЗДАНИЕ/ПРИСОЕДИНЕНИЕ ===
    
    createGame() {
        const name = document.getElementById('playerName').value.trim() || 'Игрок';
        this.myName = name;
        
        fetch('/api/create')
            .then(res => res.json())
            .then(data => {
                this.currentRoom = data.room_id;
                document.getElementById('roomDisplay').textContent = this.currentRoom;
                document.getElementById('roomInput').value = this.currentRoom;
                
                this.socket.emit('join', {
                    room_id: this.currentRoom,
                    name: this.myName
                });
                
                showToast(`✅ Комната создана! ID: ${this.currentRoom}`, 'success');
                setStatus(`🏠 Комната ${this.currentRoom} создана. Отправьте ссылку другу`, 'info-msg');
            })
            .catch(error => {
                console.error('Error creating game:', error);
                showToast('❌ Ошибка создания комнаты', 'error');
            });
    }
    
    joinGame() {
        const room = document.getElementById('roomInput').value.trim();
        const name = document.getElementById('playerName').value.trim() || 'Игрок';
        
        if (!room) {
            showToast('⚠️ Введите ID комнаты', 'error');
            return;
        }
        
        this.currentRoom = room;
        this.myName = name;
        
        document.getElementById('roomDisplay').textContent = room;
        
        this.socket.emit('join', {
            room_id: room,
            name: name
        });
    }
    
    // === УТИЛИТЫ ===
    
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        
        if (room) {
            document.getElementById('roomInput').value = room;
            document.getElementById('roomDisplay').textContent = room;
            setTimeout(() => this.joinGame(), 500);
        }
    }
    
    undoMove() {
        if (!this.currentRoom) {
            showToast('⚠️ Сначала присоединитесь к игре', 'info');
            return;
        }
        
        if (!this.canUndo) {
            setStatus('⏳ Нет ходов для отмены', 'no-undo');
            showToast('Нет ходов для отмены', 'info');
            return;
        }
        
        this.socket.emit('undo_move', {
            room_id: this.currentRoom
        });
    }
    
    resetBoard() {
        if (!this.currentRoom) {
            showToast('⚠️ Сначала присоединитесь к игре', 'info');
            return;
        }
        
        if (confirm('Сбросить доску в начальную позицию?')) {
            this.socket.emit('reset_board', { room_id: this.currentRoom });
        }
    }
    
    clearBoard() {
        if (!this.currentRoom) {
            showToast('⚠️ Сначала присоединитесь к игре', 'info');
            return;
        }
        
        if (confirm('Очистить доску (удалить все фигуры)?')) {
            this.socket.emit('clear_board', { room_id: this.currentRoom });
        }
    }
    
    flipBoard() {
        this.board.flipped = !this.board.flipped;
        this.renderer.render();
        showToast(this.board.flipped ? '🔄 Доска перевернута' : '🔄 Доска в нормальной позиции', 'info');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Глобальный экземпляр приложения
    window.app = new ChessApp();
    
    // Привязываем глобальные функции (для кнопок в HTML)
    window.createGame = () => window.app.createGame();
    window.joinGame = () => window.app.joinGame();
    window.resetBoard = () => window.app.resetBoard();
    window.clearBoard = () => window.app.clearBoard();
    window.flipBoard = () => window.app.flipBoard();
    window.undoMove = () => window.app.undoMove();
    window.toggleArrowMode = () => {
        if (window.app.arrows) {
            window.app.arrows.toggleMode();
        }
    };
    window.clearArrows = () => {
        if (window.app.arrows) {
            window.app.arrows.clearAll();
        }
    };
    
    // Выносим arrowSystem в глобальный доступ
    window.arrowSystem = window.app.arrows;
    window.currentRoom = () => window.app.currentRoom;
});