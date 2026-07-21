from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room
import random
import string
import time
import copy
import chess 

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

games = {}

def generate_room_id():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

def initial_board():
    board = []
    back_rank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    for r in range(8):
        row = []
        for c in range(8):
            if r == 0:
                row.append(back_rank[c].lower())
            elif r == 1:
                row.append('p')
            elif r == 6:
                row.append('P')
            elif r == 7:
                row.append(back_rank[c])
            else:
                row.append(None)
        board.append(row)
    return board

# Названия фигур для сервера
PIECE_NAMES = {
    'K': 'Король', 'Q': 'Ферзь', 'R': 'Ладья', 'B': 'Слон', 'N': 'Конь', 'P': 'Пешка',
    'k': 'Король', 'q': 'Ферзь', 'r': 'Ладья', 'b': 'Слон', 'n': 'Конь', 'p': 'Пешка'
}

def board_to_fen(board):
    """Преобразует доску в FEN нотацию"""
    fen = ''
    for r in range(8):
        empty = 0
        for c in range(8):
            piece = board[r][c]
            if piece:
                if empty > 0:
                    fen += str(empty)
                    empty = 0
                fen += piece
            else:
                empty += 1
        if empty > 0:
            fen += str(empty)
        if r < 7:
            fen += '/'
    fen += ' w - - 0 1'
    return fen

def get_san_move(board, from_row, from_col, to_row, to_col, promotion=None):
    """
    Генерирует SAN нотацию для хода.
    Если ход нелегальный (режим песочницы), возвращает UCI.
    """
    try:
        fen = board_to_fen(board)
        chess_board = chess.Board(fen)
        
        from_square = chess.parse_square(f"{chr(97 + from_col)}{8 - from_row}")
        to_square = chess.parse_square(f"{chr(97 + to_col)}{8 - to_row}")
        
        move = chess.Move(from_square, to_square)
        
        if promotion:
            promo_map = {
                'q': chess.QUEEN, 'Q': chess.QUEEN,
                'r': chess.ROOK, 'R': chess.ROOK,
                'b': chess.BISHOP, 'B': chess.BISHOP,
                'n': chess.KNIGHT, 'N': chess.KNIGHT
            }
            move.promotion = promo_map.get(promotion.lower())
        
        # Проверяем легальность хода
        if move not in chess_board.legal_moves:
            # Если ход нелегальный (песочница), возвращаем UCI
            return f"{chr(97 + from_col)}{8 - from_row}{chr(97 + to_col)}{8 - to_row}"
        
        # Возвращаем SAN
        return chess_board.san(move)
    except Exception as e:
        print(f"⚠️ Ошибка генерации SAN: {e}")
        # Fallback: UCI
        return f"{chr(97 + from_col)}{8 - from_row}{chr(97 + to_col)}{8 - to_row}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/create')
def create_game():
    room_id = generate_room_id()
    # Получаем режим из запроса (если передан)
    mode = request.args.get('mode', 'classic')
    games[room_id] = {
        'board': initial_board(),
        'players': [],
        'created_at': time.time(),
        'history': [],
        'move_history': [],
        'move_data_history': [],  # Для хранения данных о ходах
        'arrows': [],
        'rules_enabled': True,
        'game_mode': mode,  # Используем переданный режим
        # Состояние для Марсельских шахмат (синхронизируется между игроками)
        'marseille_state': {
            'currentTurn': 'white',
            'moveCount': 0,
            'whiteFirstMoveDone': False,
            'mustParryCheck': False,
            'checkDeclared': False,
            'lastMovedPiece': None,
            'lastMovedFrom': None
        }
    }
    print(f'✅ Комната создана: {room_id}, режим: {mode}')
    return jsonify({'room_id': room_id})

@socketio.on('connect')
def handle_connect():
    print(f'✅ Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'❌ Client disconnected: {request.sid}')
    for room_id, game in games.items():
        game['players'] = [p for p in game['players'] if p['id'] != request.sid]

@socketio.on('join')
def handle_join(data):
    room_id = data.get('room_id')
    player_name = data.get('name', 'Anonymous')

    if room_id not in games:
        emit('error', {'message': 'Комната не найдена!'})
        return

    join_room(room_id)

    existing_player = None
    for p in games[room_id]['players']:
        if p['id'] == request.sid:
            existing_player = p
            break

    # Получаем текущий режим игры
    game_mode = games[room_id].get('game_mode', 'classic')

    if existing_player:
        emit('joined', {
            'room_id': room_id,
            'player': existing_player,
            'players': games[room_id]['players'],
            'mode': game_mode
        }, room=request.sid)
        
        emit('board_update', {
            'board': games[room_id]['board'],
            'players': games[room_id]['players'],
            'can_undo': len(games[room_id]['history']) > 0,
            'history_len': len(games[room_id]['history']),
            'move_history': games[room_id].get('move_history', []),
            'arrows': games[room_id].get('arrows', []),
            'rules_enabled': games[room_id].get('rules_enabled', True),
            'game_mode': game_mode
        }, room=room_id)
        
        # Отправляем состояние Марсельских шахмат после присоединения
        if 'marseille_state' in games[room_id]:
            emit('marseille_state_update', {
                'state': games[room_id]['marseille_state']
            }, room=request.sid)
        return

    player = {
        'id': request.sid,
        'name': player_name,
        'color': 'white' if len(games[room_id]['players']) == 0 else 'black'
    }
    games[room_id]['players'].append(player)

    emit('joined', {
        'room_id': room_id,
        'player': player,
        'players': games[room_id]['players'],
        'mode': game_mode
    }, room=request.sid)

    emit('players_update', {
        'players': games[room_id]['players']
    }, room=room_id)

    emit('board_update', {
        'board': games[room_id]['board'],
        'players': games[room_id]['players'],
        'can_undo': len(games[room_id]['history']) > 0,
        'history_len': len(games[room_id]['history']),
        'move_history': games[room_id].get('move_history', []),
        'arrows': games[room_id].get('arrows', []),
        'rules_enabled': games[room_id].get('rules_enabled', True),
        'game_mode': game_mode
    }, room=room_id)

    # Отправляем состояние Марсельских шахмат после присоединения
    if 'marseille_state' in games[room_id]:
        emit('marseille_state_update', {
            'state': games[room_id]['marseille_state']
        }, room=request.sid)

    print(f'👤 {player_name} присоединился к комнате {room_id}')
    print(f'👥 Игроков в комнате: {len(games[room_id]["players"])}')
    print(f'🎮 Режим игры: {game_mode}')

@socketio.on('move')
def handle_move(data):
    """
    Обработчик хода от клиента.
    """
    room_id = data.get('room_id')
    from_pos = data.get('from')
    to_pos = data.get('to')
    is_castling = data.get('isCastling', False)
    promotion = data.get('promotion')

    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return

    game = games[room_id]
    board = game['board']
    piece = board[from_pos['row']][from_pos['col']]

    if not piece:
        emit('error', {'message': 'Нет фигуры на этой клетке'})
        return

    rules_enabled = game.get('rules_enabled', True)
    
    if rules_enabled:
        target_piece = board[to_pos['row']][to_pos['col']]
        if target_piece and target_piece.lower() == 'k':
            emit('error', {'message': '❌ Нельзя съесть короля! (правила включены)'})
            return
        
        if is_castling:
            if piece not in ['K', 'k']:
                emit('error', {'message': '❌ Рокировка возможна только королём'})
                return
            
            is_white = piece == 'K'
            row = 7 if is_white else 0
            if from_pos['row'] != row or from_pos['col'] != 4:
                emit('error', {'message': '❌ Неверная позиция для рокировки'})
                return
            
            rook = 'R' if is_white else 'r'
            if to_pos['col'] > from_pos['col']:
                if board[row][7] != rook:
                    emit('error', {'message': '❌ Нет ладьи для короткой рокировки'})
                    return
                if board[row][5] is not None or board[row][6] is not None:
                    emit('error', {'message': '❌ Путь для рокировки заблокирован'})
                    return
            else:
                if board[row][0] != rook:
                    emit('error', {'message': '❌ Нет ладьи для длинной рокировки'})
                    return
                if board[row][1] is not None or board[row][2] is not None or board[row][3] is not None:
                    emit('error', {'message': '❌ Путь для рокировки заблокирован'})
                    return

    # === СОХРАНЯЕМ СОСТОЯНИЕ ДО ХОДА (ОДИН РАЗ!) ===
    game['history'].append({
        'board': copy.deepcopy(board),
        'move': {
            'from': from_pos,
            'to': to_pos,
            'piece': piece,
            'isCastling': is_castling,
            'promotion': promotion
        }
    })

    # === ЕСЛИ ЭТО РОКИРОВКА ===
    if is_castling:
        is_white = piece == 'K'
        row = 7 if is_white else 0
        king = 'K' if is_white else 'k'
        rook = 'R' if is_white else 'r'
        
        move_str = 'O-O' if to_pos['col'] > from_pos['col'] else 'O-O-O'
        
        if to_pos['col'] > from_pos['col']:
            board[row][6] = king
            board[row][4] = None
            board[row][5] = rook
            board[row][7] = None
        else:
            board[row][2] = king
            board[row][4] = None
            board[row][3] = rook
            board[row][0] = None
        
        game['board'] = board
        game['move_history'].append(move_str)
        
        print(f'♟️ Рокировка: {move_str}')
        print(f'📜 История: {len(game["move_history"])} ходов')
        
        emit('board_update', {
            'board': board,
            'move': {
                'from': from_pos,
                'to': to_pos,
                'piece': piece,
                'isCastling': True
            },
            'players': game['players'],
            'can_undo': len(game['history']) > 0,
            'history_len': len(game['history']),
            'move_history': game['move_history'],
            'arrows': game.get('arrows', []),
            'rules_enabled': rules_enabled
        }, room=room_id)
        return

    # === ОБЫЧНЫЙ ХОД ===
    board[to_pos['row']][to_pos['col']] = piece
    board[from_pos['row']][from_pos['col']] = None

    promoted_piece = None
    is_white_pawn = piece == 'P' and to_pos['row'] == 0
    is_black_pawn = piece == 'p' and to_pos['row'] == 7

    if promotion and (is_white_pawn or is_black_pawn):
        allowed = {'q', 'r', 'b', 'n'}
        promo_key = promotion.lower() if promotion.lower() in allowed else 'q'
        promoted_piece = promo_key.upper() if is_white_pawn else promo_key.lower()
        board[to_pos['row']][to_pos['col']] = promoted_piece

    game['board'] = board

    history_len = len(game['history'])
    can_undo = history_len > 0

    # Генерируем SAN нотацию
    san_move = get_san_move(board, from_pos['row'], from_pos['col'], 
                           to_pos['row'], to_pos['col'], promotion)
    
    game['move_history'].append(san_move)

    print(f'♟️ Ход: {piece} {from_pos["row"]},{from_pos["col"]} → {to_pos["row"]},{to_pos["col"]} ({san_move})')
    if promoted_piece:
        print(f'👑 Превращение: {piece} → {promoted_piece}')
    print(f'📜 История: {len(game["move_history"])} ходов')

    emit('board_update', {
        'board': board,
        'move': {
            'from': from_pos,
            'to': to_pos,
            'piece': piece,
            'promotion': promoted_piece,
            'san': san_move
        },
        'players': game['players'],
        'can_undo': can_undo,
        'history_len': history_len,
        'move_history': game['move_history'],
        'arrows': game.get('arrows', []),
        'rules_enabled': rules_enabled
    }, room=room_id)

@socketio.on('undo_move')
def handle_undo(data):
    room_id = data.get('room_id')
    print(f'↩️ Получен запрос на отмену хода в комнате: {room_id}')

    if room_id not in games:
        print(f'❌ Комната {room_id} не найдена')
        emit('error', {'message': 'Комната не найдена'})
        return

    game = games[room_id]
    history = game['history']
    print(f'📊 История содержит {len(history)} ходов')

    if not history:
        print('❌ Нет ходов для отмены')
        emit('error', {'message': 'Нет ходов для отмены'})
        return

    # Получаем предыдущее состояние ДО изменения
    previous_state = history.pop()
    game['board'] = previous_state['board']
    
    # Удаляем последний ход из истории
    if game['move_history']:
        game['move_history'].pop()

    history_len = len(history)
    can_undo = history_len > 0

    print(f'↩️ Отменён ход, осталось: {history_len}')
    print(f'📊 Доска после отмены: {game["board"]}')

    # ============================================
    # ⚡ ОТПРАВЛЯЕМ ОБНОВЛЕНИЕ ВСЕМ В КОМНАТЕ
    # ============================================
    update_data = {
        'board': game['board'],
        'players': game['players'],
        'undo': True,
        'undo_move': previous_state['move'],
        'can_undo': can_undo,
        'history_len': history_len,
        'move_history': game['move_history'],
        'arrows': game.get('arrows', [])
    }
    
    print(f'📤 Отправка board_update с undo=True в комнату {room_id}')
    print(f'📤 Данные: {update_data}')
    
    # Отправляем всем в комнате
    emit('board_update', update_data, room=room_id)
    print('✅ board_update отправлен')

@socketio.on('reset_board')
def handle_reset(data):
    room_id = data.get('room_id')
    if room_id not in games:
        return
    
    game = games[room_id]
    game['board'] = initial_board()
    game['history'] = []
    game['move_history'] = []
    
    emit('board_update', {
        'board': game['board'],
        'players': game['players'],
        'reset': True,
        'can_undo': False,
        'history_len': 0,
        'move_history': [],
        'arrows': game.get('arrows', [])
    }, room=room_id)

@socketio.on('toggle_rules')
def handle_toggle_rules(data):
    room_id = data.get('room_id')
    
    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return
    
    game = games[room_id]
    game['rules_enabled'] = not game['rules_enabled']
    
    emit('rules_state', {
        'room_id': room_id,
        'enabled': game['rules_enabled']
    }, room=room_id)
    
    print(f'♟️ Правила в комнате {room_id}: {"включены" if game["rules_enabled"] else "выключены"}')

@socketio.on('clear_board')
def handle_clear(data):
    room_id = data.get('room_id')
    if room_id not in games:
        return
    
    game = games[room_id]
    board = [[None for _ in range(8)] for _ in range(8)]
    game['board'] = board
    game['history'] = []
    game['move_history'] = []
    
    emit('board_update', {
        'board': board,
        'players': game['players'],
        'clear': True,
        'can_undo': False,
        'history_len': 0,
        'move_history': [],
        'arrows': game.get('arrows', [])
    }, room=room_id)

@socketio.on('get_players')
def handle_get_players(data):
    room_id = data.get('room_id')
    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return
    
    emit('players_update', {
        'players': games[room_id]['players']
    }, room=request.sid)

# ============================================
# СТРЕЛКИ
# ============================================

@socketio.on('draw_arrow')
def handle_draw_arrow(data):
    room_id = data.get('room_id')
    from_pos = data.get('from')
    to_pos = data.get('to')
    color = data.get('color', '#00aa44')
    
    if room_id not in games:
        return
    
    arrow = {
        'id': f"arrow_{int(time.time()*1000)}_{request.sid[:4]}",
        'from': from_pos,
        'to': to_pos,
        'color': color,
        'player_id': request.sid
    }
    
    games[room_id]['arrows'].append(arrow)
    
    # ОТПРАВЛЯЕМ ВСЕМ В КОМНАТЕ
    emit('arrow_drawn', {
        'arrow': arrow,
        'room_id': room_id
    }, room=room_id)

@socketio.on('clear_arrows')
def handle_clear_arrows(data):
    room_id = data.get('room_id')
    if room_id not in games:
        return
    
    # Очищаем стрелки в памяти сервера
    games[room_id]['arrows'] = []
    
    # ОТПРАВЛЯЕМ ВСЕМ В КОМНАТЕ, а не только отправителю!
    emit('arrows_cleared', {'room_id': room_id}, room=room_id)
    
    print(f'🧹 Стрелки очищены в комнате {room_id} (всем участникам)')

@socketio.on('get_move_history')
def handle_get_move_history(data):
    room_id = data.get('room_id')
    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return
    
    game = games[room_id]
    emit('move_history_response', {
        'room_id': room_id,
        'move_history': game.get('move_history', []),
        'history_len': len(game.get('move_history', []))
    }, room=request.sid)

@socketio.on('set_game_mode')
def handle_set_game_mode(data):
    """Обработчик установки режима игры"""
    room_id = data.get('room_id')
    mode = data.get('mode')
    
    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return
    
    game = games[room_id]
    game['game_mode'] = mode
    
    # Отправляем всем в комнате
    emit('mode_update', {
        'room_id': room_id,
        'mode': mode
    }, room=room_id)
    
    print(f'🎮 Режим в комнате {room_id} изменён на: {mode}')

@socketio.on('get_game_mode')
def handle_get_game_mode(data):
    room_id = data.get('room_id')
    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return
    
    game = games[room_id]
    # Отправляем ответ с режимом в отдельном событии
    emit('mode_response', {
        'room_id': room_id,
        'mode': game.get('game_mode', 'classic')
    }, room=request.sid)
    print(f'📤 Отправлен режим {game.get("game_mode", "classic")} для комнаты {room_id} (mode_response)')

@socketio.on('update_marseille_state')
def handle_update_marseille_state(data):
    room_id = data.get('room_id')
    state = data.get('state')
    
    if room_id not in games:
        return
    
    # Сохраняем состояние в игре
    games[room_id]['marseille_state'] = state
    
    # Отправляем всем в комнате (кроме отправителя)
    emit('marseille_state_update', {
        'state': state
    }, room=room_id, skip_sid=request.sid)

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("♚ Шахматы Песочница со стрелками")
    print("=" * 50)
    print("✅ Сервер запущен!")
    print("📱 http://127.0.0.1:8000")
    print("=" * 50 + "\n")

    socketio.run(app, debug=True, host='0.0.0.0', port=8000)