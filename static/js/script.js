// ============================================
// ШАХМАТЫ ПЕСОЧНИЦА — JavaScript
// ============================================

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentRoom = null;
let board = [];
let selectedCell = null;
let myName = '';
let myColor = null;
let flipped = false;
let players = [];
let moveHistory = [];
let canUndo = false;
let lastMove = { from: null, to: null };
let socket = null;

// СИНХРОНИЗАЦИЯ С window
window.canUndo = canUndo;
window.moveHistory = moveHistory;

// === НАЗВАНИЯ ФИГУР ===
const PIECE_NAMES = {
    'K': 'Король', 'Q': 'Ферзь', 'R': 'Ладья', 'B': 'Слон', 'N': 'Конь', 'P': 'Пешка',
    'k': 'Король', 'q': 'Ферзь', 'r': 'Ладья', 'b': 'Слон', 'n': 'Конь', 'p': 'Пешка'
};

// === ИНИЦИАЛИЗАЦИЯ ДОСКИ ===
function initialBoard() {
    const board = [];
    const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let r = 0; r < 8; r++) {
        board[r] = [];
        for (let c = 0; c < 8; c++) {
            if (r === 0) board[r][c] = backRank[c].toLowerCase();
            else if (r === 1) board[r][c] = 'p';
            else if (r === 6) board[r][c] = 'P';
            else if (r === 7) board[r][c] = backRank[c];
            else board[r][c] = null;
        }
    }
    return board;
}

// === ОБНОВЛЕНИЕ КНОПКИ UNDO ===
function updateUndoButton() {
    const btn = document.getElementById('undoBtn');
    if (!btn) return;
    
    // Синхронизируем глобальные переменные
    window.canUndo = canUndo;
    window.moveHistory = moveHistory;
    
    btn.disabled = !canUndo;
    btn.style.opacity = canUndo ? '1' : '0.5';
    btn.title = canUndo ? `Отменить последний ход (${moveHistory.length})` : 'Нет ходов для отмены';
    
    const badge = document.getElementById('undoBadge');
    if (badge) {
        badge.textContent = moveHistory.length;
        badge.style.display = moveHistory.length > 0 ? 'inline' : 'none';
    }
    
    console.log(`↩️ Кнопка UNDO: ${canUndo ? 'АКТИВНА' : 'НЕАКТИВНА'} (${moveHistory.length} ходов)`);
}

// === РЕНДЕРИНГ ДОСКИ ===
function renderBoard() {
    console.log('🔄 Рендеринг доски...');
    const boardEl = document.getElementById('chessBoard');
    if (!boardEl) {
        console.error('❌ Элемент chessBoard не найден!');
        return;
    }
    boardEl.innerHTML = '';

    const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    for (let ri = 0; ri < 8; ri++) {
        const r = rows[ri];
        for (let ci = 0; ci < 8; ci++) {
            const c = cols[ci];
            const cell = document.createElement('div');
            const isWhite = (r + c) % 2 === 0;
            cell.className = `chess-cell ${isWhite ? 'white' : 'black'}`;

            if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
                cell.classList.add('selected');
            }

            if (lastMove.from && lastMove.from.row === r && lastMove.from.col === c) {
                cell.classList.add('last-move-from');
            }
            if (lastMove.to && lastMove.to.row === r && lastMove.to.col === c) {
                cell.classList.add('last-move-to');
            }

            const piece = board[r]?.[c];
            if (piece && typeof PIECES_SVG !== 'undefined' && PIECES_SVG[piece]) {
                const svgContent = PIECES_SVG[piece];
                if (svgContent) {
                    const wrapper = document.createElement('div');
                    wrapper.style.width = '100%';
                    wrapper.style.height = '100%';
                    wrapper.style.display = 'flex';
                    wrapper.style.alignItems = 'center';
                    wrapper.style.justifyContent = 'center';
                    wrapper.style.padding = '10%';
                    wrapper.innerHTML = svgContent;
                    cell.appendChild(wrapper);
                }
            }

            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => onCellClick(r, c));
            boardEl.appendChild(cell);
        }
    }
    
    updateStatus();
    updateSidebar();
    updateUndoButton();
    
    // ============================================
    // ВАЖНО: Перерисовываем стрелки после обновления доски
    // ============================================
    if (window.arrowSystem) {
        // Небольшая задержка, чтобы DOM успел обновиться
        setTimeout(() => {
            window.arrowSystem.render();
        }, 10);
    }
    
    console.log('✅ Доска отрендерена');
}
// === ОБРАБОТКА КЛИКА ===
function onCellClick(row, col) {
    console.log(`🖱️ Клик по клетке ${row},${col}`);
    if (!currentRoom) {
        showToast('Сначала присоединитесь к игре!', 'info');
        return;
    }

    const piece = board[row]?.[col];
    if (!selectedCell) {
        if (piece) {
            selectedCell = { row, col };
            renderBoard();
            const pieceName = PIECE_NAMES[piece] || piece;
            const square = `${String.fromCharCode(65 + col)}${8 - row}`;
            setStatus(`Выбрана ${pieceName} (${square})`, 'info-msg');
        }
        return;
    }

    if (selectedCell.row === row && selectedCell.col === col) {
        selectedCell = null;
        renderBoard();
        setStatus('Выбор снят', 'info-msg');
        return;
    }

    const fromRow = selectedCell.row;
    const fromCol = selectedCell.col;
    const fromPiece = board[fromRow]?.[fromCol];

    if (fromPiece) {
        board[row][col] = fromPiece;
        board[fromRow][fromCol] = null;
        lastMove.from = { row: fromRow, col: fromCol };
        lastMove.to = { row: row, col: col };

        const fromName = PIECE_NAMES[fromPiece] || fromPiece;
        const fromSquare = `${String.fromCharCode(65 + fromCol)}${8 - fromRow}`;
        const toSquare = `${String.fromCharCode(65 + col)}${8 - row}`;
        const moveStr = `${fromName} ${fromSquare}→${toSquare}`;
        
        moveHistory.push(moveStr);
        document.getElementById('lastMove').textContent = moveStr;
        setStatus(`Ход: ${moveStr}`, 'success');

        if (window.socket) {
            window.socket.emit('move', {
                room_id: currentRoom,
                from: { row: fromRow, col: fromCol },
                to: { row: row, col: col }
            });
        }

        selectedCell = null;
        renderBoard();
    }
}

// === СТАТУС ===
function setStatus(text, className = 'info-msg') {
    const statusEl = document.getElementById('chessStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span class="${className}">${text}</span>`;
    }
}

function updateStatus() {
    if (!currentRoom) {
        setStatus('💡 Создайте игру или присоединитесь к комнате', 'info-msg');
        return;
    }
    const playerCount = players ? players.length : 0;
    if (playerCount < 2) {
        setStatus(`⏳ Ожидание игроков... (${playerCount}/2)`, 'info-msg');
    } else {
        setStatus('🎮 Игра активна! Перемещайте фигуры', 'success');
    }
}

function updateSidebar() {
    // === СЧЁТЧИК ФИГУР ===
    let count = 0;
    if (board) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r]?.[c]) count++;
            }
        }
    }
    document.getElementById('pieceCount').textContent = count;
    
    // === ИГРОКИ ===
    document.getElementById('whitePlayer').textContent = players?.[0]?.name || '—';
    document.getElementById('blackPlayer').textContent = players?.[1]?.name || '—';
    document.getElementById('playersDisplay').textContent = `👥 Игроков: ${players ? players.length : 0}`;
    
    // === ЦВЕТ ИГРОКА ===
    const colorEmoji = myColor === 'white' ? '⚪' : myColor === 'black' ? '⚫' : '❓';
    const colorName = myColor === 'white' ? 'белых' : myColor === 'black' ? 'черных' : '—';
    document.getElementById('colorDisplay').textContent = `${colorEmoji} Вы: ${colorName}`;
    
    // === ССЫЛКА НА КОМНАТУ ===
    const roomId = document.getElementById('roomDisplay')?.textContent;
    if (roomId && roomId !== '—') {
        const link = window.getRoomLink ? window.getRoomLink(roomId) : `${window.location.origin}/?room=${roomId}`;
        document.getElementById('linkDisplay').textContent = link;
    }
    
    // === СЧЁТЧИК СТРЕЛОК ===
    if (window.arrowSystem) {
        const arrowCount = window.arrowSystem.getArrows().length;
        document.getElementById('arrowCount').textContent = arrowCount;
    }
}

// === TOAST ===
let toastTimeout = null;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log(`[${type}] ${message}`);
        return;
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    clearTimeout(toastTimeout);
    setTimeout(() => toast.classList.add('show'), 10);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// === ГЛОБАЛЬНЫЙ SOCKET ===
window.socket = io();

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
window.createGame = async function() {
    myName = document.getElementById('playerName').value.trim() || 'Игрок';
    try {
        const response = await fetch('/api/create');
        const data = await response.json();
        currentRoom = data.room_id;
        document.getElementById('roomDisplay').textContent = currentRoom;
        document.getElementById('roomInput').value = currentRoom;
        if (window.socket) {
            window.socket.emit('join', { room_id: currentRoom, name: myName });
        }
        showToast(`✅ Комната создана! ID: ${currentRoom}`, 'success');
        setStatus(`🏠 Комната ${currentRoom} создана. Отправьте ссылку другу`, 'info-msg');
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Ошибка создания комнаты', 'error');
    }
};

window.joinGame = function() {
    currentRoom = document.getElementById('roomInput').value.trim();
    window.currentRoom = currentRoom; // Синхронизируем с глобальной переменной
    myName = document.getElementById('playerName').value.trim() || 'Игрок';
    
    if (!currentRoom) {
        if (typeof showToast === 'function') {
            showToast('⚠️ Введите ID комнаты', 'error');
        }
        return;
    }
    
    document.getElementById('roomDisplay').textContent = currentRoom;
    
    // Синхронизируем с arrowSystem
    if (window.arrowSystem) {
        window.arrowSystem.currentRoom = currentRoom;
    }
    
    // Синхронизируем с undoManager
    if (window.undoManager) {
        window.undoManager.setRoom(currentRoom);
    }
    
    if (window.socket) {
        window.socket.emit('join', { 
            room_id: currentRoom, 
            name: myName 
        });
        console.log(`🔗 Присоединение к комнате ${currentRoom} как ${myName}`);
    } else {
        console.error('❌ Socket не инициализирован');
        if (typeof showToast === 'function') {
            showToast('❌ Нет соединения с сервером', 'error');
        }
    }
};

window.resetBoard = function() {
    if (!currentRoom) {
        showToast('⚠️ Сначала присоединитесь к игре', 'info');
        return;
    }
    if (confirm('Сбросить доску в начальную позицию?')) {
        if (window.socket) {
            window.socket.emit('reset_board', { room_id: currentRoom });
        }
    }
};

window.clearBoard = function() {
    if (!currentRoom) {
        showToast('⚠️ Сначала присоединитесь к игре', 'info');
        return;
    }
    if (confirm('Очистить доску (удалить все фигуры)?')) {
        if (window.socket) {
            window.socket.emit('clear_board', { room_id: currentRoom });
        }
    }
};

window.flipBoard = function() {
    flipped = !flipped;
    window.flipped = flipped; // Синхронизируем с глобальной переменной
    renderBoard();
    
    // Обновляем стрелки с учётом переворота
    if (window.arrowSystem) {
        setTimeout(() => {
            window.arrowSystem.setFlipped(flipped);
        }, 50);
    }
    
    if (typeof showToast === 'function') {
        showToast(flipped ? '🔄 Доска перевернута' : '🔄 Доска в нормальной позиции', 'info');
    }
};

window.copyLink = function(link) {
    if (!link || link === '—') {
        showToast('⚠️ Нет ссылки для копирования', 'warning');
        return;
    }
    navigator.clipboard.writeText(link)
        .then(() => showToast('📋 Ссылка скопирована!', 'success'))
        .catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('📋 Ссылка скопирована!', 'success');
        });
};

window.getRoomLink = function(roomId) {
    if (window.location.pathname.startsWith('/chess/')) {
        return `https://5-187-0-91.nip.io/chess/?room=${roomId}`;
    }
    if (window.location.port === '8000') {
        return `http://${window.location.hostname}:8000/?room=${roomId}`;
    }
    return `${window.location.origin}/?room=${roomId}`;
};

window.undoMove = function() {
    console.log('↩️ Вызвана undoMove, canUndo:', canUndo, 'history:', moveHistory.length);
    if (!currentRoom) {
        showToast('⚠️ Сначала присоединитесь к игре', 'info');
        return;
    }
    if (!canUndo || moveHistory.length === 0) {
        showToast('Нет ходов для отмены', 'info');
        return;
    }
    if (window.socket) {
        window.socket.emit('undo_move', { room_id: currentRoom });
    }
};

// === SOCKET СОБЫТИЯ ===
window.socket.on('connect', () => {
    console.log('🔌 Подключено к серверу');
});

window.socket.on('disconnect', () => {
    console.log('🔌 Отключено от сервера');
    showToast('🔌 Отключено от сервера', 'error');
});

window.socket.on('joined', (data) => {
    console.log('📥 joined:', data);
    currentRoom = data.room_id;
    window.currentRoom = currentRoom; // Синхронизируем
    
    myColor = data.player.color;
    players = data.players;
    flipped = (myColor === 'black');
    document.getElementById('roomDisplay').textContent = currentRoom;
    
    // Синхронизируем с arrowSystem
    if (window.arrowSystem) {
        window.arrowSystem.currentRoom = currentRoom;
    }
    
    // Синхронизируем с undoManager
    if (window.undoManager) {
        window.undoManager.setRoom(currentRoom);
    }
    
    // Сбрасываем историю
    moveHistory = [];
    canUndo = false;
    window.canUndo = false;
    window.moveHistory = [];
    updateUndoButton();
    
    renderBoard();
    updateStatus();
    
    if (typeof showToast === 'function') {
        showToast(`✅ Присоединились к комнате ${currentRoom}`, 'success');
    }
});

window.socket.on('board_update', (data) => {
    console.log('📥 board_update:', {
        has_move: !!data.move,
        can_undo: data.can_undo,
        players: data.players?.length
    });
    
    board = data.board;
    players = data.players || [];
    
    // === ОБНОВЛЕНИЕ ПОСЛЕДНЕГО ХОДА И ПОДСВЕТКИ ===
    if (data.move) {
        lastMove.from = data.move.from;
        lastMove.to = data.move.to;
        console.log('📌 Последний ход:', lastMove);
        
        // Синхронизируем подсветку
        if (window.moveHighlight) {
            window.moveHighlight.setLastMove(data.move);
            console.log('🎯 Подсветка обновлена из board_update');
        }
        
        // Сохраняем глобально для других модулей
        window.lastMoveData = data.move;
    }
    
    // === ОБНОВЛЕНИЕ can_undo ===
    if (data.can_undo !== undefined) {
        canUndo = data.can_undo;
        window.canUndo = canUndo;
        console.log(`↩️ can_undo = ${canUndo}, window.canUndo = ${window.canUndo}`);
        updateUndoButton();
    }
    
    // === РЕНДЕРИНГ ===
    renderBoard();
    updateStatus();
    updateSidebar();
    
    // === ОБРАБОТКА ОТМЕНЫ ===
    if (data.undo) {
        showToast('↩️ Ход отменён', 'info');
        if (moveHistory.length > 0) {
            moveHistory.pop();
            window.moveHistory = moveHistory;
        }
        selectedCell = null;
        lastMove.from = null;
        lastMove.to = null;
        
        // Очищаем подсветку при отмене
        if (window.moveHighlight) {
            window.moveHighlight.clearLastMove();
            console.log('🎯 Подсветка очищена (отмена)');
        }
        window.lastMoveData = null;
        
        canUndo = data.can_undo || false;
        window.canUndo = canUndo;
        updateUndoButton();
        renderBoard();
    }
    
    // === ОБРАБОТКА СБРОСА ===
    if (data.reset) {
        showToast('🔄 Доска сброшена', 'info');
        selectedCell = null;
        lastMove.from = null;
        lastMove.to = null;
        moveHistory = [];
        window.moveHistory = [];
        canUndo = false;
        window.canUndo = false;
        
        // Очищаем подсветку при сбросе
        if (window.moveHighlight) {
            window.moveHighlight.clearLastMove();
            console.log('🎯 Подсветка очищена (сброс)');
        }
        window.lastMoveData = null;
        
        updateUndoButton();
        renderBoard();
    }
    
    // === ОБРАБОТКА ОЧИСТКИ ===
    if (data.clear) {
        showToast('🗑️ Доска очищена', 'info');
        selectedCell = null;
        lastMove.from = null;
        lastMove.to = null;
        moveHistory = [];
        window.moveHistory = [];
        canUndo = false;
        window.canUndo = false;
        
        // Очищаем подсветку при очистке
        if (window.moveHighlight) {
            window.moveHighlight.clearLastMove();
            console.log('🎯 Подсветка очищена (очистка)');
        }
        window.lastMoveData = null;
        
        updateUndoButton();
        renderBoard();
    }
});

window.socket.on('error', (data) => {
    showToast(`❌ ${data.message}`, 'error');
    setStatus(`❌ ${data.message}`, 'error');
});

// === ИНИЦИАЛИЗАЦИЯ ===
console.log('🚀 Загрузка script.js');
board = initialBoard();

// Экспортируем глобальные переменные
window.canUndo = canUndo;
window.moveHistory = moveHistory;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM загружен');
        renderBoard();
        updateUndoButton();
        
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room) {
            document.getElementById('roomInput').value = room;
            document.getElementById('roomDisplay').textContent = room;
            setTimeout(window.joinGame, 500);
        }
    });
} else {
    renderBoard();
    updateUndoButton();
}

console.log('✅ script.js загружен');

// ============================================
// СИНХРОНИЗАЦИЯ UNDOMANAGER С ИГРОЙ
// ============================================

// Функция синхронизации
function syncUndoManager() {
    if (window.undoManager) {
        console.log('🔄 Синхронизация undoManager...');
        window.undoManager.syncFromGame(
            currentRoom,
            moveHistory,
            canUndo
        );
        console.log('✅ undoManager синхронизирован');
    } else {
        console.warn('⚠️ undoManager не найден для синхронизации');
    }
}

// Вызываем синхронизацию после каждого обновления
const originalBoardUpdate = window.socket?.on ? 
    window.socket.on.bind(window.socket) : null;

if (window.socket && window.socket.on) {
    // Сохраняем оригинальный обработчик
    const originalHandler = window.socket.on;
    
    window.socket.on = function(event, callback) {
        if (event === 'board_update') {
            const wrappedCallback = function(data) {
                // Вызываем оригинальный callback
                callback(data);
                
                // Синхронизируем undoManager
                setTimeout(syncUndoManager, 50);
            };
            originalHandler.call(window.socket, event, wrappedCallback);
        } else {
            originalHandler.call(window.socket, event, callback);
        }
    };
}

// Синхронизируем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(syncUndoManager, 100);
});

// Синхронизируем после каждого хода
const originalOnCellClick = window.onCellClick;
if (originalOnCellClick) {
    window.onCellClick = function(row, col) {
        originalOnCellClick(row, col);
        setTimeout(syncUndoManager, 100);
    };
}

console.log('✅ Синхронизация undoManager настроена');
