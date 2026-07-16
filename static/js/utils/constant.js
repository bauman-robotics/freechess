// static/js/utils/constants.js

// ============================================
// ГЛОБАЛЬНЫЕ КОНСТАНТЫ
// ============================================

// Шахматные фигуры
export const PIECES = {
    WHITE: {
        KING: 'K',
        QUEEN: 'Q',
        ROOK: 'R',
        BISHOP: 'B',
        KNIGHT: 'N',
        PAWN: 'P'
    },
    BLACK: {
        KING: 'k',
        QUEEN: 'q',
        ROOK: 'r',
        BISHOP: 'b',
        KNIGHT: 'n',
        PAWN: 'p'
    }
};

// Названия фигур на русском
export const PIECE_NAMES = {
    'K': 'Король',
    'Q': 'Ферзь',
    'R': 'Ладья',
    'B': 'Слон',
    'N': 'Конь',
    'P': 'Пешка',
    'k': 'Король',
    'q': 'Ферзь',
    'r': 'Ладья',
    'b': 'Слон',
    'n': 'Конь',
    'p': 'Пешка'
};

// Названия фигур на английском
export const PIECE_NAMES_EN = {
    'K': 'King',
    'Q': 'Queen',
    'R': 'Rook',
    'B': 'Bishop',
    'N': 'Knight',
    'P': 'Pawn',
    'k': 'King',
    'q': 'Queen',
    'r': 'Rook',
    'b': 'Bishop',
    'n': 'Knight',
    'p': 'Pawn'
};

// Цвета фигур
export const PIECE_COLORS = {
    WHITE: 'white',
    BLACK: 'black'
};

// Размер доски
export const BOARD_SIZE = 8;

// Начальная расстановка
export const INITIAL_BOARD = {
    BACK_RANK: ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
};

// Цвета клеток
export const CELL_COLORS = {
    WHITE: '#f0d9b5',
    BLACK: '#b58863',
    SELECTED: '#7fc97f',
    LAST_MOVE: 'rgba(60, 80, 20, 0.7)'
};

// Типы ходов
export const MOVE_TYPES = {
    NORMAL: 'normal',
    CAPTURE: 'capture',
    CASTLING: 'castling',
    EN_PASSANT: 'en_passant',
    PROMOTION: 'promotion'
};

// Максимальная длина истории
export const MAX_HISTORY = 100;

// Цвета для стрелок
export const ARROW_COLORS = [
    '#ff0000',  // Красный
    '#00ff00',  // Зелёный
    '#ffff00',  // Жёлтый
    '#00aaff',  // Голубой
    '#ff00ff',  // Розовый
    '#ff8800',  // Оранжевый
    '#ff1493',  // Розовый-фуксия
    '#00ffcc'   // Бирюзовый
];

// Socket события
export const SOCKET_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    JOIN: 'join',
    JOINED: 'joined',
    MOVE: 'move',
    BOARD_UPDATE: 'board_update',
    UNDO_MOVE: 'undo_move',
    RESET_BOARD: 'reset_board',
    CLEAR_BOARD: 'clear_board',
    DRAW_ARROW: 'draw_arrow',
    ARROW_DRAWN: 'arrow_drawn',
    REMOVE_ARROW: 'remove_arrow',
    ARROW_REMOVED: 'arrow_removed',
    CLEAR_ARROWS: 'clear_arrows',
    ARROWS_CLEARED: 'arrows_cleared',
    ERROR: 'error'
};

// Сообщения статуса
export const STATUS_MESSAGES = {
    WAITING: '⏳ Ожидание игроков...',
    ACTIVE: '🎮 Игра активна! Перемещайте фигуры',
    NO_GAME: '💡 Создайте игру или присоединитесь к комнате',
    SELECTED: 'Выбрана фигура',
    MOVE_MADE: 'Ход сделан',
    UNDO: '↩️ Ход отменён',
    RESET: '🔄 Доска сброшена',
    CLEAR: '🗑️ Доска очищена'
};

// Режимы игры
export const GAME_MODES = {
    SANDBOX: 'sandbox',
    CLASSIC: 'classic',
    FISCHER: 'fischer'
};

// Экспорт по умолчанию
export default {
    PIECES,
    PIECE_NAMES,
    PIECE_NAMES_EN,
    PIECE_COLORS,
    BOARD_SIZE,
    INITIAL_BOARD,
    CELL_COLORS,
    MOVE_TYPES,
    MAX_HISTORY,
    ARROW_COLORS,
    SOCKET_EVENTS,
    STATUS_MESSAGES,
    GAME_MODES
};