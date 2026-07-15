// ============================================
// ШАХМАТЫ ПЕСОЧНИЦА — JavaScript
// ============================================

// === КОНФИГУРАЦИЯ ===
const socket = io();
//const socket = io({
//    path: '/chess/socket.io/'
//});
let currentRoom = null;
let board = [];
let selectedCell = null;
let myName = '';
let myColor = null;
let flipped = false;
let players = [];
let moveHistory = [];

// === НАЗВАНИЯ ФИГУР ===
const PIECE_NAMES = {
    'K': 'Король', 'Q': 'Ферзь', 'R': 'Ладья', 'B': 'Слон', 'N': 'Конь', 'P': 'Пешка',
    'k': 'Король', 'q': 'Ферзь', 'r': 'Ладья', 'b': 'Слон', 'n': 'Конь', 'p': 'Пешка'
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ ДОСКИ
// ============================================
function initialBoard() {
    const board = [];
    const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

    for (let r = 0; r < 8; r++) {
        board[r] = [];
        for (let c = 0; c < 8; c++) {
            if (r === 0) board[r][c] = backRank[c].toLowerCase(); // чёрные, ранг 8
            else if (r === 1) board[r][c] = 'p';                   // чёрные пешки, ранг 7
            else if (r === 6) board[r][c] = 'P';                   // белые пешки, ранг 2
            else if (r === 7) board[r][c] = backRank[c];           // белые, ранг 1
            else board[r][c] = null;
        }
    }
    return board;
}

board = initialBoard();

// ============================================
// РЕНДЕРИНГ ДОСКИ С SVG ФИГУРАМИ
// ============================================
function renderBoard() {
    const boardEl = document.getElementById('chessBoard');
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

            const piece = board[r][c];
            if (piece) {
                const svgContent = PIECES_SVG[piece] || '';
                if (svgContent) {
                    const svgWrapper = document.createElement('div');
                    svgWrapper.style.width = '100%';
                    svgWrapper.style.height = '100%';
                    svgWrapper.style.display = 'flex';
                    svgWrapper.style.alignItems = 'center';
                    svgWrapper.style.justifyContent = 'center';
                    svgWrapper.style.padding = '10%';
                    svgWrapper.innerHTML = svgContent;

                    const svgEl = svgWrapper.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.width = '100%';
                        svgEl.style.height = '100%';
                        svgEl.style.display = 'block';
                        svgEl.style.maxWidth = '100%';
                        svgEl.style.maxHeight = '100%';
                    }

                    cell.appendChild(svgWrapper);
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
}

// ============================================
// ОБРАБОТКА КЛИКА ПО КЛЕТКЕ
// ============================================
function onCellClick(row, col) {
    if (!currentRoom) {
        showToast('Сначала присоединитесь к игре!', 'info');
        return;
    }

    const piece = board[row][col];

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
    const fromPiece = board[fromRow][fromCol];

    if (fromPiece) {
        const fromName = PIECE_NAMES[fromPiece] || fromPiece;
        const fromSquare = `${String.fromCharCode(65 + fromCol)}${8 - fromRow}`;
        const toSquare = `${String.fromCharCode(65 + col)}${8 - row}`;

        board[row][col] = fromPiece;
        board[fromRow][fromCol] = null;

        socket.emit('move', {
            room_id: currentRoom,
            from: { row: fromRow, col: fromCol },
            to: { row: row, col: col }
        });

        const moveStr = `${fromName} ${fromSquare}→${toSquare}`;
        moveHistory.push(moveStr);
        document.getElementById('lastMove').textContent = moveStr;

        setStatus(`Ход: ${moveStr}`, 'success');

        selectedCell = null;
        renderBoard();
    }
}

// ============================================
// СОЗДАНИЕ ИГРЫ
// ============================================
async function createGame() {
    myName = document.getElementById('playerName').value.trim() || 'Игрок';

    try {
        const response = await fetch('/api/create');
        const data = await response.json();
        currentRoom = data.room_id;

        document.getElementById('roomDisplay').textContent = currentRoom;
        document.getElementById('roomInput').value = currentRoom;

        // ИСПОЛЬЗУЕМ ФУНКЦИЮ
        const link = getRoomLink(currentRoom);
        document.getElementById('linkDisplay').textContent = link;

        socket.emit('join', {
            room_id: currentRoom,
            name: myName
        });

        showToast(`✅ Комната создана! ID: ${currentRoom}`, 'success');
        setStatus(`🏠 Комната ${currentRoom} создана. Отправьте ссылку другу`, 'info-msg');
    } catch (error) {
        console.error('Error creating game:', error);
        showToast('❌ Ошибка создания комнаты', 'error');
    }
}


// ============================================
// ПРИСОЕДИНЕНИЕ К ИГРЕ
// ============================================
function joinGame() {
    currentRoom = document.getElementById('roomInput').value.trim();
    myName = document.getElementById('playerName').value.trim() || 'Игрок';

    if (!currentRoom) {
        showToast('⚠️ Введите ID комнаты', 'error');
        return;
    }

    document.getElementById('roomDisplay').textContent = currentRoom;

    // ИСПОЛЬЗУЕМ ФУНКЦИЮ
    const link = getRoomLink(currentRoom);
    document.getElementById('linkDisplay').textContent = link;

    socket.emit('join', {
        room_id: currentRoom,
        name: myName
    });
}

// ============================================
// СБРОС ДОСКИ
// ============================================
function resetBoard() {
    if (!currentRoom) {
        showToast('⚠️ Сначала присоединитесь к игре', 'info');
        return;
    }

    if (confirm('Сбросить доску в начальную позицию?')) {
        socket.emit('reset_board', { room_id: currentRoom });
        showToast('🔄 Доска сброшена', 'info');
        setStatus('Доска сброшена в начальную позицию', 'info-msg');
        moveHistory = [];
        document.getElementById('lastMove').textContent = '—';
        selectedCell = null;
    }
}

// ============================================
// ОЧИСТКА ДОСКИ
// ============================================
function clearBoard() {
    if (!currentRoom) {
        showToast('⚠️ Сначала присоединитесь к игре', 'info');
        return;
    }

    if (confirm('Очистить доску (удалить все фигуры)?')) {
        socket.emit('clear_board', { room_id: currentRoom });
        showToast('🗑️ Доска очищена', 'info');
        setStatus('Все фигуры удалены', 'info-msg');
        moveHistory = [];
        document.getElementById('lastMove').textContent = '—';
        selectedCell = null;
    }
}

// ============================================
// ПЕРЕВОРОТ ДОСКИ
// ============================================
function flipBoard() {
    flipped = !flipped;
    renderBoard();
    showToast(flipped ? '🔄 Доска перевернута' : '🔄 Доска в нормальной позиции', 'info');
}

// ============================================
// UI УТИЛИТЫ
// ============================================
function setStatus(text, className = 'info-msg') {
    const statusEl = document.getElementById('chessStatus');
    statusEl.innerHTML = `<span class="${className}">${text}</span>`;
}

function updateStatus() {
    if (!currentRoom) {
        setStatus('💡 Создайте игру или присоединитесь к комнате', 'info-msg');
        return;
    }

    const playerCount = players.length;
    const colorEmoji = myColor === 'white' ? '⚪' : myColor === 'black' ? '⚫' : '❓';
    const colorName = myColor === 'white' ? 'белых' : myColor === 'black' ? 'черных' : '—';

    document.getElementById('playersDisplay').textContent = `👥 Игроков: ${playerCount}`;
    document.getElementById('colorDisplay').textContent = `${colorEmoji} Вы: ${colorName}`;

    if (playerCount < 2) {
        setStatus(`⏳ Ожидание игроков... (${playerCount}/2)`, 'info-msg');
    } else {
        setStatus('🎮 Игра активна! Перемещайте фигуры', 'success');
    }
}

function updateSidebar() {
    let count = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c]) count++;
        }
    }
    document.getElementById('pieceCount').textContent = count;

    if (players.length >= 1) {
        document.getElementById('whitePlayer').textContent = players[0]?.name || '—';
    } else {
        document.getElementById('whitePlayer').textContent = '—';
    }

    if (players.length >= 2) {
        document.getElementById('blackPlayer').textContent = players[1]?.name || '—';
    } else {
        document.getElementById('blackPlayer').textContent = '—';
    }
}

// ============================================
// TOAST УВЕДОМЛЕНИЯ
// ============================================
let toastTimeout = null;

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    clearTimeout(toastTimeout);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// КОПИРОВАНИЕ ССЫЛКИ
// ============================================
function copyLink(link) {
    if (!link || link === '—') {
        showToast('⚠️ Нет ссылки для копирования', 'warning');
        return;
    }

    navigator.clipboard.writeText(link)
        .then(() => {
            showToast('📋 Ссылка скопирована!', 'success');
        })
        .catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('📋 Ссылка скопирована!', 'success');
        });
}

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ФОРМИРОВАНИЯ ССЫЛОК
// ============================================
function getRoomLink(roomId) {
    // Если мы уже на странице /chess/ - используем этот путь
    if (window.location.pathname.startsWith('/chess/')) {
        return `${window.location.origin}/chess/?room=${roomId}`;
    }
    // Иначе используем корневой путь (для локальной разработки)
    return `${window.location.origin}/?room=${roomId}`;
}

// ============================================
// SOCKET СОБЫТИЯ
// ============================================
socket.on('connect', () => {
    console.log('🔌 Подключено к серверу');
});

socket.on('disconnect', () => {
    console.log('🔌 Отключено от сервера');
    showToast('🔌 Отключено от сервера', 'error');
});

// ============================================
// SOCKET СОБЫТИЯ
// ============================================
socket.on('joined', (data) => {
    currentRoom = data.room_id;
    myColor = data.player.color;
    players = data.players;

    flipped = (myColor === 'black');

    document.getElementById('roomDisplay').textContent = currentRoom;

    // ИСПОЛЬЗУЕМ ФУНКЦИЮ
    const link = getRoomLink(currentRoom);
    document.getElementById('linkDisplay').textContent = link;

    renderBoard();
    updateStatus();

    const colorEmoji = myColor === 'white' ? '⚪' : '⚫';
    const colorName = myColor === 'white' ? 'белых' : 'черных';
    showToast(`✅ Присоединились к комнате ${currentRoom} (${colorEmoji} ${colorName})`, 'success');

    // Обновляем URL в зависимости от текущего пути
    const url = new URL(window.location);
    if (window.location.pathname.startsWith('/chess/')) {
        url.pathname = '/chess/';
    } else {
        url.pathname = '/';
    }
    url.searchParams.set('room', currentRoom);
    window.history.pushState({}, '', url);
});

socket.on('board_update', (data) => {
    board = data.board;
    players = data.players || [];

    renderBoard();
    updateStatus();
    updateSidebar();

    if (data.move) {
        const move = data.move;
        const pieceName = PIECE_NAMES[move.piece] || move.piece;
        const fromSquare = `${String.fromCharCode(65 + move.from.col)}${8 - move.from.row}`;
        const toSquare = `${String.fromCharCode(65 + move.to.col)}${8 - move.to.row}`;

        if (!(selectedCell && selectedCell.row === move.from.row && selectedCell.col === move.from.col)) {
            const moveStr = `${pieceName} ${fromSquare}→${toSquare}`;
            setStatus(`Ход соперника: ${moveStr}`, 'info-msg');
            document.getElementById('lastMove').textContent = moveStr;
        }
    }

    if (data.reset) {
        showToast('🔄 Доска сброшена', 'info');
        selectedCell = null;
        moveHistory = [];
        document.getElementById('lastMove').textContent = '—';
    }

    if (data.clear) {
        showToast('🗑️ Доска очищена', 'info');
        selectedCell = null;
        moveHistory = [];
        document.getElementById('lastMove').textContent = '—';
    }
});

socket.on('error', (data) => {
    showToast(`❌ ${data.message}`, 'error');
    setStatus(`❌ ${data.message}`, 'error');
});

// ============================================
// ЗАГРУЗКА СТРАНИЦЫ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');

    if (room) {
        document.getElementById('roomInput').value = room;
        document.getElementById('roomDisplay').textContent = room;
        setTimeout(joinGame, 500);
    }

    renderBoard();

    document.getElementById('roomDisplay').addEventListener('click', function() {
        const roomId = this.textContent;
        if (roomId && roomId !== '—') {
            // ИСПОЛЬЗУЕМ ФУНКЦИЮ
            const link = getRoomLink(roomId);
            copyLink(link);
        }
    });

    document.getElementById('linkDisplay').addEventListener('click', function() {
        const link = this.textContent;
        copyLink(link);
    });

    document.getElementById('roomInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinGame();
        }
    });

    document.getElementById('playerName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('roomInput').focus();
        }
    });
});

// ============================================
// ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ
// ============================================
window.createGame = createGame;
window.joinGame = joinGame;
window.resetBoard = resetBoard;
window.clearBoard = clearBoard;
window.flipBoard = flipBoard;
