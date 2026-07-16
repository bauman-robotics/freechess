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

    // === ПРОВЕРЯЕМ ШАХ ДЛЯ ОБОИХ ИГРОКОВ ===
    let kingsInCheck = [];

    if (window.chessRules && window.chessRules.isEnabled) {
        // Проверяем шах для белых
        window.chessRules.setCurrentColor('white');
        if (window.chessRules.isInCheck(board)) {
            const king = 'K';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (board[r]?.[c] === king) {
                        kingsInCheck.push({ row: r, col: c, color: 'white' });
                        break;
                    }
                }
            }
        }
        
        // Проверяем шах для чёрных
        window.chessRules.setCurrentColor('black');
        if (window.chessRules.isInCheck(board)) {
            const king = 'k';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (board[r]?.[c] === king) {
                        kingsInCheck.push({ row: r, col: c, color: 'black' });
                        break;
                    }
                }
            }
        }
        
        // Возвращаем цвет для текущего игрока (для других проверок)
        window.chessRules.setCurrentColor(myColor);
    }

    for (let ri = 0; ri < 8; ri++) {
        const r = rows[ri];
        for (let ci = 0; ci < 8; ci++) {
            const c = cols[ci];
            const cell = document.createElement('div');
            const isWhite = (r + c) % 2 === 0;
            cell.className = `chess-cell ${isWhite ? 'white' : 'black'}`;

            // === ПОДСВЕТКА КОРОЛЯ ПРИ ШАХЕ (ДЛЯ ОБОИХ ИГРОКОВ) ===
            const isKingInCheck = kingsInCheck.some(k => k.row === r && k.col === c);
            if (isKingInCheck) {
                cell.classList.add('king-in-check');
            }

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
    updateRoomLink();
    
    if (window.arrowSystem) {
        window.arrowSystem.setFlipped(flipped);
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
        // === ОТЛАДКА РОКИРОВКИ ===
        console.log('🔍 Отладка рокировки:');
        console.log('  myColor:', myColor);
        console.log('  fromRow:', fromRow, 'fromCol:', fromCol);
        console.log('  toRow:', row, 'toCol:', col);
        console.log('  fromPiece:', fromPiece);
        console.log('  isCastling?', (fromPiece === 'K' || fromPiece === 'k') && Math.abs(col - fromCol) === 2);
        
        let moveStr = '';
        const isCastlingMove = (fromPiece === 'K' || fromPiece === 'k') && Math.abs(col - fromCol) === 2;
        
        // === ПРОВЕРКА ПРАВИЛ ===
        if (window.chessRules && window.chessRules.isEnabled) {
            if (isCastlingMove) {
                console.log('♟️ Обнаружена рокировка!');
                // Проверяем рокировку вручную
                const isValid = window.chessRules.isValidCastling(fromRow, fromCol, row, col, board, myColor);
                console.log('  Рокировка валидна:', isValid);
                if (!isValid) {
                    if (typeof showToast === 'function') {
                        showToast('❌ Недопустимая рокировка!', 'error');
                    }
                    selectedCell = null;
                    renderBoard();
                    return;
                }
                
                // Отправляем рокировку на сервер
                if (window.socket) {
                    window.socket.emit('move', {
                        room_id: currentRoom,
                        from: { row: fromRow, col: fromCol },
                        to: { row: row, col: col },
                        isCastling: true
                    });
                }
                
                const fromName = PIECE_NAMES[fromPiece] || fromPiece;
                const fromSquare = `${String.fromCharCode(65 + fromCol)}${8 - fromRow}`;
                const toSquare = `${String.fromCharCode(65 + col)}${8 - row}`;
                moveStr = (col > fromCol) ? 'O-O' : 'O-O-O';
                
                moveHistory.push(moveStr);
                window.moveHistory = moveHistory;
                console.log('📜 Ход добавлен в историю:', moveStr, 'Всего:', moveHistory.length);
                
                document.getElementById('lastMove').textContent = moveStr;
                setStatus(`Ход: ${moveStr}`, 'success');
                
                selectedCell = null;
                renderBoard();
                return;
            } else {
                // Обычная проверка хода
                const isValid = window.chessRules.isValidMove(fromRow, fromCol, row, col, board, myColor);
                if (!isValid) {
                    if (typeof showToast === 'function') {
                        showToast('❌ Недопустимый ход!', 'error');
                    }
                    selectedCell = null;
                    renderBoard();
                    return;
                }
                
                // Выполняем ход через chess.js
                const newBoard = window.chessRules.makeMove(fromRow, fromCol, row, col, board, myColor);
                if (newBoard) {
                    board = newBoard;
                } else {
                    // Если не удалось выполнить ход через chess.js
                    board[row][col] = fromPiece;
                    board[fromRow][fromCol] = null;
                }
                
                const fromName = PIECE_NAMES[fromPiece] || fromPiece;
                const fromSquare = `${String.fromCharCode(65 + fromCol)}${8 - fromRow}`;
                const toSquare = `${String.fromCharCode(65 + col)}${8 - row}`;
                moveStr = `${fromName} ${fromSquare}→${toSquare}`;
            }
        } else {
            // Если правила выключены - просто перемещаем
            board[row][col] = fromPiece;
            board[fromRow][fromCol] = null;
            const fromName = PIECE_NAMES[fromPiece] || fromPiece;
            const fromSquare = `${String.fromCharCode(65 + fromCol)}${8 - fromRow}`;
            const toSquare = `${String.fromCharCode(65 + col)}${8 - row}`;
            moveStr = `${fromName} ${fromSquare}→${toSquare}`;
        }
        
        lastMove.from = { row: fromRow, col: fromCol };
        lastMove.to = { row: row, col: col };
        
        // Проверяем шах/мат после хода
        if (moveStr && window.chessRules && window.chessRules.isEnabled) {
            const boardCopy = board.map(row => [...row]);
            if (window.chessRules.isCheckmate(boardCopy)) {
                moveStr += ' #';
            } else if (window.chessRules.isInCheck(boardCopy)) {
                moveStr += ' +';
            }
        }
        
        if (moveStr) {
            moveHistory.push(moveStr);
            window.moveHistory = moveHistory;
            console.log('📜 Ход добавлен в историю:', moveStr, 'Всего:', moveHistory.length);
            
            document.getElementById('lastMove').textContent = moveStr;
            setStatus(`Ход: ${moveStr}`, 'success');
        }

        if (window.socket && !isCastlingMove) {
            window.socket.emit('move', {
                room_id: currentRoom,
                from: { row: fromRow, col: fromCol },
                to: { row: row, col: col },
                isCastling: false
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
        return;
    }

    if (window.chessRules && window.chessRules.isEnabled && board) {
        // Проверяем шах для белых
        window.chessRules.setCurrentColor('white');
        const whiteInCheck = window.chessRules.isInCheck(board);
        
        // Проверяем шах для чёрных
        window.chessRules.setCurrentColor('black');
        const blackInCheck = window.chessRules.isInCheck(board);
        
        // Возвращаем цвет для текущего игрока
        window.chessRules.setCurrentColor(myColor);
        
        if (window.chessRules.isCheckmate(board)) {
            setStatus('♛ МАТ! Игра окончена!', 'success');
            return;
        }
        if (window.chessRules.isStalemate(board)) {
            setStatus('🤝 ПАТ! Ничья!', 'info');
            return;
        }
        if (whiteInCheck) {
            setStatus('⚠️ Белые под шахом!', 'warning');
            return;
        }
        if (blackInCheck) {
            setStatus('⚠️ Чёрные под шахом!', 'warning');
            return;
        }
        if (window.chessRules.isDraw(board)) {
            setStatus('🤝 Ничья!', 'info');
            return;
        }
    }
    
    // Если нет шаха, показываем чей ход
    if (isMyTurn !== undefined) {
        setStatus(isMyTurn ? '🎯 Ваш ход!' : '⏳ Ожидание хода соперника...', isMyTurn ? 'success' : 'info-msg');
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
    if (roomId && roomId !== '—' && roomId !== '') {
        const link = window.getRoomLink ? window.getRoomLink(roomId) : `${window.location.origin}/?room=${roomId}`;
        document.getElementById('linkDisplay').textContent = link;
    } else {
        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        if (roomFromUrl) {
            const link = window.getRoomLink ? window.getRoomLink(roomFromUrl) : `${window.location.origin}/?room=${roomFromUrl}`;
            document.getElementById('linkDisplay').textContent = link;
        }
    }
    
    // === СЧЁТЧИК СТРЕЛОК ===
    if (window.arrowSystem) {
        const arrowCount = window.arrowSystem.getArrows().length;
        document.getElementById('arrowCount').textContent = arrowCount;
    }
    
    // === ИСТОРИЯ ХОДОВ ===
    updateHistoryDisplay();
}

// ============================================
// ОБНОВЛЕНИЕ ИСТОРИИ В UI
// ============================================
function updateHistoryDisplay() {
    const historyEl = document.getElementById('moveHistory');
    const historyCountEl = document.getElementById('historyCount');
    
    if (window.moveHistory && window.moveHistory.length > 0) {
        moveHistory = window.moveHistory;
    }
    
    if (historyCountEl) {
        historyCountEl.textContent = moveHistory.length;
    }
    
    if (historyEl) {
        if (moveHistory.length === 0) {
            historyEl.innerHTML = '<div style="color: #666; text-align: center; padding: 8px; font-size: 12px;">История пуста</div>';
        } else {
            let html = '';
            const displayHistory = moveHistory.slice(-20);
            
            for (let i = 0; i < displayHistory.length; i++) {
                const move = displayHistory[i];
                const moveNumber = Math.floor(i / 2) + 1;
                
                if (i % 2 === 0) {
                    html += `<div class="move-item">`;
                    html += `<span class="move-number">${moveNumber}.</span>`;
                    html += `<span class="move-text white-move">${move}</span>`;
                } else {
                    html += `<span class="move-text black-move">${move}</span>`;
                    html += `</div>`;
                }
            }
            if (displayHistory.length % 2 !== 0) {
                html += `</div>`;
            }
            historyEl.innerHTML = html;
            console.log('📜 История обновлена, ходов:', moveHistory.length);
        }
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
        
        // === ДОБАВЬТЕ ЭТО ===
        setTimeout(updateRoomLink, 100);
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Ошибка создания комнаты', 'error');
    }
};

window.joinGame = function() {
    currentRoom = document.getElementById('roomInput').value.trim();
    window.currentRoom = currentRoom;
    myName = document.getElementById('playerName').value.trim() || 'Игрок';
    
    if (!currentRoom) {
        if (typeof showToast === 'function') {
            showToast('⚠️ Введите ID комнаты', 'error');
        }
        return;
    }
    
    document.getElementById('roomDisplay').textContent = currentRoom;
    
    if (window.socket) {
        window.socket.emit('join', { 
            room_id: currentRoom, 
            name: myName 
        });
        console.log(`🔗 Присоединение к комнате ${currentRoom} как ${myName}`);
    }
    
    // === ДОБАВЬТЕ ЭТО ===
    setTimeout(updateRoomLink, 100);
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
    // Запрашиваем игроков после подключения
    if (window.currentRoom) {
        window.socket.emit('get_players', { room_id: window.currentRoom });
    }
});

window.socket.on('disconnect', () => {
    console.log('🔌 Отключено от сервера');
    showToast('🔌 Отключено от сервера', 'error');
});

window.socket.on('joined', (data) => {
    console.log('📥 joined:', data);
    currentRoom = data.room_id;
    window.currentRoom = currentRoom;
    
    myColor = data.player.color;
    players = data.players;
    flipped = (myColor === 'black');
    window.flipped = flipped;
    
    document.getElementById('roomDisplay').textContent = currentRoom;
    
    // Синхронизируем с arrowSystem
    if (window.arrowSystem) {
        window.arrowSystem.currentRoom = currentRoom;
        window.arrowSystem.setFlipped(flipped);
    }
    
    // Синхронизируем с undoManager
    if (window.undoManager) {
        window.undoManager.setRoom(currentRoom);
    }
    
    // Синхронизируем правила при присоединении
    if (data.rules_enabled !== undefined && window.chessRules) {
        window.chessRules.isEnabled = data.rules_enabled;
        setTimeout(updateRulesButton, 100);
        console.log(`♟️ Правила синхронизированы при присоединении: ${data.rules_enabled ? 'включены' : 'выключены'}`);
    }
    
    // Сбрасываем историю
    moveHistory = [];
    canUndo = false;
    window.canUndo = false;
    window.moveHistory = [];
    updateUndoButton();
    
    renderBoard();
    updateStatus();
    
    // Обновляем ссылку
    updateRoomLink();
    
    if (typeof showToast === 'function') {
        showToast(`✅ Присоединились к комнате ${currentRoom}`, 'success');
    }
});

// === ОБНОВЛЕНИЕ СПИСКА ИГРОКОВ ===
window.socket.on('players_update', (data) => {
    console.log('📥 players_update:', data);
    if (data.players) {
        players = data.players;
        // Обновляем отображение
        updateSidebar();
        updateStatus();
        console.log('👥 Игроки обновлены:', players.length);
    }
});

// === ПОЛУЧЕНИЕ ОБНОВЛЕНИЯ ПРАВИЛ ===
window.socket.on('rules_state', (data) => {
    console.log('📥 Получено обновление правил:', data);
    if (data.enabled !== undefined) {
        syncRulesFromServer(data.enabled);
        if (typeof showToast === 'function') {
            showToast(`♟️ Правила ${data.enabled ? 'включены' : 'выключены'}`, 'info');
        }
    }
});

window.joinGame = function() {
    currentRoom = document.getElementById('roomInput').value.trim();
    window.currentRoom = currentRoom;
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

window.socket.on('board_update', (data) => {
    console.log('📥 board_update:', {
        has_move: !!data.move,
        can_undo: data.can_undo,
        players: data.players?.length,
        arrows_count: data.arrows?.length || 0,
        history_len: data.history_len || 0,
        move_history_len: data.move_history?.length || 0
    });
    
    board = data.board;

    // === ОБНОВЛЯЕМ ИГРОКОВ ===
    if (data.players) {
        players = data.players;
        console.log('👥 Игроки обновлены из board_update:', players.length);
    }
    
    players = data.players || [];
    
    // === СИНХРОНИЗАЦИЯ ИСТОРИИ ===
    if (data.move_history) {
        moveHistory = data.move_history;
        window.moveHistory = moveHistory;
        console.log('📜 История синхронизирована с сервера:', moveHistory.length);
        updateHistoryDisplay();
    } else if (data.move && !data.undo) {
        const pieceName = PIECE_NAMES[data.move.piece] || data.move.piece;
        const fromSquare = `${String.fromCharCode(65 + data.move.from.col)}${8 - data.move.from.row}`;
        const toSquare = `${String.fromCharCode(65 + data.move.to.col)}${8 - data.move.to.row}`;
        
        // === ПРОВЕРКА НА РОКИРОВКУ ===
        let moveStr;
        const piece = data.move.piece;
        const fromCol = data.move.from.col;
        const toCol = data.move.to.col;
        
        // Проверяем, что это король и он переместился на 2 клетки по горизонтали
        if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
            // Это рокировка
            if (toCol > fromCol) {
                moveStr = 'O-O';  // Короткая рокировка
            } else {
                moveStr = 'O-O-O'; // Длинная рокировка
            }
        } else {
            moveStr = `${pieceName} ${fromSquare}→${toSquare}`;
        }
        
        if (window.chessRules && window.chessRules.isEnabled) {
            if (window.chessRules.isCheckmate(board)) {
                moveStr += ' #';
            } else if (window.chessRules.isInCheck(board)) {
                moveStr += ' +';
            }
        }
        moveHistory.push(moveStr);
        window.moveHistory = moveHistory;
        console.log('📜 Ход добавлен локально:', moveStr);
        
        updateHistoryDisplay();
    }
    
    // === СИНХРОНИЗАЦИЯ ПРАВИЛ ===
    if (data.rules_enabled !== undefined) {
        if (window.chessRules) {
            window.chessRules.isEnabled = data.rules_enabled;
            updateRulesButton();
            console.log(`♟️ Правила синхронизированы: ${data.rules_enabled ? 'включены' : 'выключены'}`);
        }
    }

    // === ОБНОВЛЕНИЕ СТРЕЛОК ===
    if (data.arrows !== undefined) {
        if (window.arrowSystem) {
            window.arrowSystem.setArrows(data.arrows);
        }
    }
    
    // === ОБНОВЛЕНИЕ ПОСЛЕДНЕГО ХОДА И ПОДСВЕТКИ ===
    if (data.move) {
        lastMove.from = data.move.from;
        lastMove.to = data.move.to;
        
        const pieceName = PIECE_NAMES[data.move.piece] || data.move.piece;
        const fromSquare = `${String.fromCharCode(65 + data.move.from.col)}${8 - data.move.from.row}`;
        const toSquare = `${String.fromCharCode(65 + data.move.to.col)}${8 - data.move.to.row}`;
        
        // === ПРОВЕРКА НА РОКИРОВКУ ===
        let moveStr;
        const piece = data.move.piece;
        const fromCol = data.move.from.col;
        const toCol = data.move.to.col;
        
        // Проверяем, что это король и он переместился на 2 клетки по горизонтали
        if ((piece === 'K' || piece === 'k') && Math.abs(toCol - fromCol) === 2) {
            // Это рокировка
            if (toCol > fromCol) {
                moveStr = 'O-O';  // Короткая рокировка
            } else {
                moveStr = 'O-O-O'; // Длинная рокировка
            }
        } else {
            moveStr = `${pieceName} ${fromSquare}→${toSquare}`;
        }
        
        // Добавляем шах/мат
        if (window.chessRules && window.chessRules.isEnabled) {
            if (window.chessRules.isCheckmate(board)) {
                moveStr += ' #';
            } else if (window.chessRules.isInCheck(board)) {
                moveStr += ' +';
            }
        }
        document.getElementById('lastMove').textContent = moveStr;
        
        if (window.moveHighlight) {
            window.moveHighlight.setLastMove(data.move);
        }
        window.lastMoveData = data.move;
    }
    
    // === ОБНОВЛЕНИЕ can_undo ===
    if (data.can_undo !== undefined) {
        canUndo = data.can_undo;
        window.canUndo = canUndo;
        updateUndoButton();
    }
    
    // === РЕНДЕРИНГ ===
    renderBoard();
    updateStatus();
    updateSidebar();
    updateHistoryDisplay();
    
    // === ОБРАБОТКА ОТМЕНЫ ===
    if (data.undo) {
        showToast('↩️ Ход отменён', 'info');
        if (moveHistory.length > 0) {
            moveHistory.pop();
            window.moveHistory = moveHistory;
            updateHistoryDisplay();
        }
        selectedCell = null;
        lastMove.from = null;
        lastMove.to = null;
        
        if (window.moveHighlight) {
            window.moveHighlight.clearLastMove();
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
        updateHistoryDisplay();
        canUndo = false;
        window.canUndo = false;
        
        if (window.moveHighlight) {
            window.moveHighlight.clearLastMove();
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
        updateHistoryDisplay();
        canUndo = false;
        window.canUndo = false;
        
        if (window.moveHighlight) {
            window.moveHighlight.clearLastMove();
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


// === КНОПКА ПРАВИЛ ===
window.toggleRules = function() {
    if (!window.chessRules) {
        console.warn('⚠️ chessRules не найден');
        if (typeof showToast === 'function') {
            showToast('⚠️ Система правил не загружена', 'error');
        }
        return;
    }
    
    // Переключаем состояние
    window.chessRules.setEnabled(!window.chessRules.isEnabled);
    updateRulesButton();
    
    // Обновляем статус
    if (typeof updateStatus === 'function') {
        updateStatus();
    }
    
    // Показываем уведомление
    if (typeof showToast === 'function') {
        showToast(window.chessRules.isEnabled ? '✅ Правила включены' : '⛔ Правила выключены', 'info');
    }
};

// === ОБНОВЛЕНИЕ КНОПКИ ПРАВИЛ ===
function updateRulesButton() {
    const btn = document.getElementById('rulesToggle');
    if (!btn) return;
    
    if (!window.chessRules) {
        btn.innerHTML = '♟️ Правила';
        btn.style.background = '';
        btn.style.borderColor = '';
        return;
    }
    
    const isEnabled = window.chessRules.isEnabled;
    const btnHeight = btn.offsetHeight || 30;
    const dotSize = Math.max(10, Math.round(btnHeight / 3));
    
    const indicator = document.createElement('span');
    indicator.className = 'rules-indicator';
    
    if (isEnabled) {
        indicator.style.cssText = `
            display: inline-block;
            width: ${dotSize}px;
            height: ${dotSize}px;
            border-radius: 50%;
            background: #28a745;
            border: 2px solid #28a745;
            margin-left: 6px;
            vertical-align: middle;
            flex-shrink: 0;
            transition: all 0.3s ease;
            box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
        `;
        btn.style.background = 'rgba(40, 167, 69, 0.15)';
        btn.style.borderColor = '#28a745';
        btn.style.color = '#28a745';
    } else {
        indicator.style.cssText = `
            display: inline-block;
            width: ${dotSize}px;
            height: ${dotSize}px;
            border-radius: 50%;
            background: transparent;
            border: 2px solid #6c757d;
            margin-left: 6px;
            vertical-align: middle;
            flex-shrink: 0;
            transition: all 0.3s ease;
        `;
        btn.style.background = 'transparent';
        btn.style.borderColor = '#6c757d';
        btn.style.color = '#6c757d';
    }
    
    btn.innerHTML = '';
    btn.appendChild(document.createTextNode('♟️ Правила '));
    btn.appendChild(indicator);
}

// === КНОПКА ПРАВИЛ ===
window.toggleRules = function() {
    if (!window.chessRules) {
        console.warn('⚠️ chessRules не найден');
        if (typeof showToast === 'function') {
            showToast('⚠️ Система правил не загружена', 'error');
        }
        return;
    }
    
    // Переключаем состояние локально
    window.chessRules.setEnabled(!window.chessRules.isEnabled);
    updateRulesButton();
    
    // Отправляем на сервер
    if (window.socket && window.currentRoom) {
        window.socket.emit('toggle_rules', {
            room_id: window.currentRoom
        });
        console.log('📤 Отправка состояния правил на сервер');
    }
    
    // Обновляем статус
    if (typeof updateStatus === 'function') {
        updateStatus();
    }
    
    if (typeof showToast === 'function') {
        showToast(window.chessRules.isEnabled ? '✅ Правила включены' : '⛔ Правила выключены', 'info');
    }
};

// === СИНХРОНИЗАЦИЯ ПРАВИЛ С СЕРВЕРА ===
function syncRulesFromServer(enabled) {
    if (!window.chessRules) {
        console.warn('⚠️ chessRules не найден для синхронизации');
        return;
    }
    
    // Обновляем состояние
    window.chessRules.setEnabled(enabled);
    updateRulesButton();
    
    // Обновляем статус
    if (typeof updateStatus === 'function') {
        updateStatus();
    }
    
    console.log(`♟️ Правила синхронизированы с сервера: ${enabled ? 'включены' : 'выключены'}`);
}

// === ИНИЦИАЛИЗАЦИЯ КНОПКИ ПРАВИЛ ===
function initRulesButton() {
    const btn = document.getElementById('rulesToggle');
    if (!btn) return;
    
    // Устанавливаем начальное состояние (по умолчанию включены)
    if (window.chessRules) {
        window.chessRules.isEnabled = true;
        updateRulesButton();
    } else {
        // Если chessRules ещё не загружен, ждём
        const checkInterval = setInterval(function() {
            if (window.chessRules) {
                window.chessRules.isEnabled = true;
                updateRulesButton();
                clearInterval(checkInterval);
                console.log('✅ Кнопка правил инициализирована');
            }
        }, 100);
        
        // Таймаут на случай, если не загрузится
        setTimeout(function() {
            clearInterval(checkInterval);
            if (!window.chessRules) {
                console.warn('⚠️ chessRules не загружен для инициализации кнопки');
            }
        }, 3000);
    }
}

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
    initRulesButton();
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

function updateRoomLink() {
    // Пробуем получить из элемента
    let roomId = document.getElementById('roomDisplay')?.textContent;
    
    // Если пусто - пробуем из переменной
    if (!roomId || roomId === '—' || roomId === '') {
        roomId = currentRoom;
    }
    
    // Если всё ещё пусто - пробуем из URL
    if (!roomId || roomId === '—' || roomId === '') {
        const params = new URLSearchParams(window.location.search);
        roomId = params.get('room');
    }
    
    if (roomId && roomId !== '—' && roomId !== '') {
        const link = window.getRoomLink ? window.getRoomLink(roomId) : `${window.location.origin}/?room=${roomId}`;
        document.getElementById('linkDisplay').textContent = link;
        console.log('🔗 Ссылка обновлена:', link);
        return true;
    } else {
        console.log('⚠️ Не удалось получить roomId для ссылки');
        return false;
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
// Убираем обёртку, так как она ломает рокировку
// Вместо этого добавляем синхронизацию в конец onCellClick

console.log('✅ Синхронизация undoManager настроена');
