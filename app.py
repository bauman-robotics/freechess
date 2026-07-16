from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room
import random
import string
import time
import copy

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/create')
def create_game():
    room_id = generate_room_id()
    games[room_id] = {
        'board': initial_board(),
        'players': [],
        'created_at': time.time(),
        'history': [],
        'arrows': []
    }
    print(f'✅ Комната создана: {room_id}')
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

    player = {
        'id': request.sid,
        'name': player_name,
        'color': 'white' if len(games[room_id]['players']) == 0 else 'black'
    }
    games[room_id]['players'].append(player)

    emit('joined', {
        'room_id': room_id,
        'player': player,
        'players': games[room_id]['players']
    })

    # Отправляем текущее состояние доски, историю и СТРЕЛКИ
    emit('board_update', {
        'board': games[room_id]['board'],
        'players': games[room_id]['players'],
        'can_undo': len(games[room_id]['history']) > 0,
        'history_len': len(games[room_id]['history']),
        'arrows': games[room_id].get('arrows', [])  # <-- ДОБАВЬТЕ ЭТУ СТРОКУ
    }, room=room_id)

    print(f'👤 {player_name} присоединился к комнате {room_id}')

@socketio.on('move')
def handle_move(data):
    room_id = data.get('room_id')
    from_pos = data.get('from')
    to_pos = data.get('to')

    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return

    game = games[room_id]
    board = game['board']
    piece = board[from_pos['row']][from_pos['col']]

    if not piece:
        emit('error', {'message': 'Нет фигуры на этой клетке'})
        return

    game['history'].append({
        'board': copy.deepcopy(board),
        'move': {
            'from': from_pos,
            'to': to_pos,
            'piece': piece
        }
    })

    board[to_pos['row']][to_pos['col']] = piece
    board[from_pos['row']][from_pos['col']] = None

    game['board'] = board
    
    # НЕ ОЧИЩАЕМ СТРЕЛКИ - ОСТАВЛЯЕМ КАК ЕСТЬ

    history_len = len(game['history'])
    can_undo = history_len > 0

    print(f'♟️ Ход: {piece} {from_pos["row"]},{from_pos["col"]} → {to_pos["row"]},{to_pos["col"]}')

    emit('board_update', {
        'board': board,
        'move': {
            'from': from_pos,
            'to': to_pos,
            'piece': piece
        },
        'players': game['players'],
        'can_undo': can_undo,
        'history_len': history_len,
        'arrows': game.get('arrows', [])  # ПЕРЕДАЁМ СТРЕЛКИ
    }, room=room_id)

@socketio.on('undo_move')
def handle_undo(data):
    room_id = data.get('room_id')

    if room_id not in games:
        emit('error', {'message': 'Комната не найдена'})
        return

    game = games[room_id]
    history = game['history']

    if not history:
        emit('error', {'message': 'Нет ходов для отмены'})
        return

    previous_state = history.pop()
    game['board'] = previous_state['board']
    
    # НЕ ОЧИЩАЕМ СТРЕЛКИ

    history_len = len(history)
    can_undo = history_len > 0

    emit('board_update', {
        'board': game['board'],
        'players': game['players'],
        'undo': True,
        'undo_move': previous_state['move'],
        'can_undo': can_undo,
        'history_len': history_len,
        'arrows': game.get('arrows', [])
    }, room=room_id)

@socketio.on('reset_board')
def handle_reset(data):
    room_id = data.get('room_id')
    if room_id not in games:
        return
    
    game = games[room_id]
    game['board'] = initial_board()
    game['history'] = []
    # game['arrows'] = []  # НЕ ОЧИЩАЕМ СТРЕЛКИ ПРИ СБРОСЕ
    
    emit('board_update', {
        'board': game['board'],
        'players': game['players'],
        'reset': True,
        'can_undo': False,
        'history_len': 0,
        'arrows': game.get('arrows', [])
    }, room=room_id)

@socketio.on('clear_board')
def handle_clear(data):
    room_id = data.get('room_id')
    if room_id not in games:
        return
    
    game = games[room_id]
    board = [[None for _ in range(8)] for _ in range(8)]
    game['board'] = board
    game['history'] = []
    # game['arrows'] = []  # НЕ ОЧИЩАЕМ СТРЕЛКИ
    
    emit('board_update', {
        'board': board,
        'players': game['players'],
        'clear': True,
        'can_undo': False,
        'history_len': 0,
        'arrows': game.get('arrows', [])
    }, room=room_id)

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
    
    emit('arrow_drawn', {
        'arrow': arrow,
        'room_id': room_id
    }, room=room_id)

@socketio.on('clear_arrows')
def handle_clear_arrows(data):
    room_id = data.get('room_id')
    if room_id not in games:
        return
    games[room_id]['arrows'] = []
    emit('arrows_cleared', {'room_id': room_id}, room=room_id)

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("♚ Шахматы Песочница со стрелками")
    print("=" * 50)
    print("✅ Сервер запущен!")
    print("📱 http://127.0.0.1:8000")
    print("=" * 50 + "\n")

    socketio.run(app, debug=True, host='0.0.0.0', port=8000)