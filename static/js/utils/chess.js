// static/js/utils/chess.js

// ============================================
// ШАХМАТНЫЕ УТИЛИТЫ
// ============================================

import { BOARD_SIZE, PIECES, INITIAL_BOARD } from './constants.js';

/**
 * Создаёт начальную доску
 * @returns {Array} - Двумерный массив 8x8
 */
export function createInitialBoard() {
    const board = [];
    const backRank = INITIAL_BOARD.BACK_RANK;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (r === 0) board[r][c] = backRank[c].toLowerCase();
            else if (r === 1) board[r][c] = PIECES.BLACK.PAWN;
            else if (r === 6) board[r][c] = PIECES.WHITE.PAWN;
            else if (r === 7) board[r][c] = backRank[c];
            else board[r][c] = null;
        }
    }
    return board;
}

/**
 * Проверяет, является ли клетка валидной
 * @param {number} row - Строка (0-7)
 * @param {number} col - Колонка (0-7)
 * @returns {boolean}
 */
export function isValidCell(row, col) {
    return row >= 0 && row < BOARD_SIZE && 
           col >= 0 && col < BOARD_SIZE;
}

/**
 * Проверяет, есть ли фигура на клетке
 * @param {Array} board - Доска
 * @param {number} row - Строка
 * @param {number} col - Колонка
 * @returns {boolean}
 */
export function hasPiece(board, row, col) {
    if (!isValidCell(row, col)) return false;
    return board[row][col] !== null;
}

/**
 * Получает фигуру с клетки
 * @param {Array} board - Доска
 * @param {number} row - Строка
 * @param {number} col - Колонка
 * @returns {string|null} - Фигура или null
 */
export function getPiece(board, row, col) {
    if (!isValidCell(row, col)) return null;
    return board[row][col];
}

/**
 * Определяет цвет фигуры
 * @param {string} piece - Фигура (например, 'P', 'p', 'K', 'k')
 * @returns {string|null} - 'white', 'black' или null
 */
export function getPieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

/**
 * Проверяет, являются ли фигуры одного цвета
 * @param {string} piece1 - Первая фигура
 * @param {string} piece2 - Вторая фигура
 * @returns {boolean}
 */
export function isSameColor(piece1, piece2) {
    return getPieceColor(piece1) === getPieceColor(piece2);
}

/**
 * Проверяет, является ли фигура белой
 * @param {string} piece - Фигура
 * @returns {boolean}
 */
export function isWhite(piece) {
    return piece && piece === piece.toUpperCase();
}

/**
 * Проверяет, является ли фигура чёрной
 * @param {string} piece - Фигура
 * @returns {boolean}
 */
export function isBlack(piece) {
    return piece && piece === piece.toLowerCase();
}

/**
 * Преобразует координаты клетки в шахматную нотацию
 * @param {number} row - Строка (0-7)
 * @param {number} col - Колонка (0-7)
 * @returns {string} - Например, 'e4'
 */
export function toAlgebraic(row, col) {
    if (!isValidCell(row, col)) return '';
    return `${String.fromCharCode(65 + col)}${BOARD_SIZE - row}`;
}

/**
 * Преобразует шахматную нотацию в координаты
 * @param {string} square - Например, 'e4'
 * @returns {Object|null} - { row, col } или null
 */
export function fromAlgebraic(square) {
    if (!square || square.length < 2) return null;
    
    const col = square.charCodeAt(0) - 65;
    const row = BOARD_SIZE - parseInt(square[1]);
    
    if (!isValidCell(row, col)) return null;
    return { row, col };
}

/**
 * Проверяет, является ли ход легальным (базовая проверка)
 * @param {Array} board - Доска
 * @param {Object} from - { row, col }
 * @param {Object} to - { row, col }
 * @returns {boolean}
 */
export function isValidMove(board, from, to) {
    if (!from || !to) return false;
    if (!isValidCell(from.row, from.col)) return false;
    if (!isValidCell(to.row, to.col)) return false;
    
    const piece = getPiece(board, from.row, from.col);
    if (!piece) return false;
    
    const target = getPiece(board, to.row, to.col);
    if (target && isSameColor(piece, target)) return false;
    
    return true;
}

/**
 * Генерирует FEN нотацию для текущей позиции
 * @param {Array} board - Доска
 * @returns {string} - FEN строка
 */
export function generateFEN(board) {
    let fen = '';
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        let empty = 0;
        for (let c = 0; c < BOARD_SIZE; c++) {
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
        if (r < BOARD_SIZE - 1) fen += '/';
    }
    
    return fen;
}

/**
 * Парсит FEN нотацию в доску
 * @param {string} fen - FEN строка
 * @returns {Array} - Двумерный массив 8x8
 */
export function parseFEN(fen) {
    const board = [];
    const rows = fen.split('/');
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        let c = 0;
        const row = rows[r] || '';
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
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

/**
 * Копирует доску
 * @param {Array} board - Доска
 * @returns {Array} - Копия доски
 */
export function copyBoard(board) {
    return board.map(row => [...row]);
}

/**
 * Подсчитывает количество фигур на доске
 * @param {Array} board - Доска
 * @returns {number}
 */
export function countPieces(board) {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c]) count++;
        }
    }
    return count;
}

/**
 * Получает все фигуры определённого цвета
 * @param {Array} board - Доска
 * @param {string} color - 'white' или 'black'
 * @returns {Array} - Массив { row, col, piece }
 */
export function getPiecesByColor(board, color) {
    const pieces = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = board[r][c];
            if (piece && getPieceColor(piece) === color) {
                pieces.push({ row: r, col: c, piece });
            }
        }
    }
    return pieces;
}

/**
 * Проверяет, пуста ли доска
 * @param {Array} board - Доска
 * @returns {boolean}
 */
export function isEmpty(board) {
    return countPieces(board) === 0;
}

/**
 * Проверяет, находится ли король под шахом
 * @param {Array} board - Доска
 * @param {string} color - 'white' или 'black'
 * @returns {boolean}
 */
export function isKingInCheck(board, color) {
    const king = color === 'white' ? PIECES.WHITE.KING : PIECES.BLACK.KING;
    const opponent = color === 'white' ? 'black' : 'white';
    
    // Находим короля
    let kingPos = null;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === king) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }
    
    if (!kingPos) return false;
    
    // Проверяем, атакуют ли фигуры противника короля
    // TODO: Реализовать полную проверку шаха
    return false;
}

// Экспорт по умолчанию
export default {
    createInitialBoard,
    isValidCell,
    hasPiece,
    getPiece,
    getPieceColor,
    isSameColor,
    isWhite,
    isBlack,
    toAlgebraic,
    fromAlgebraic,
    isValidMove,
    generateFEN,
    parseFEN,
    copyBoard,
    countPieces,
    getPiecesByColor,
    isEmpty,
    isKingInCheck
};