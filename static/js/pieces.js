// ============================================
// ШАХМАТНЫЕ ФИГУРЫ В ВИДЕ КАКТУСОВ
// Стиль: 3D-печать, кактусовый набор
// Белые = светло-зелёные, Чёрные = тёмно-зелёные
// ============================================

const PIECES_SVG = {

    // === БЕЛЫЙ КОРОЛЬ — Сагуаро с поднятыми руками + крест наверху ===
    'K': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#c8f0be" stroke="#2a6820" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="38.5" width="25" height="3.5" rx="1.75"/>
  <path d="M 20 38.5 L 20 28 Q 20 26 22.5 26 Q 25 26 25 28 L 25 38.5 Z"/>
  <path d="M 20 28 C 20 26 18 25 16 23 C 14 21 13 18 15 17 C 17 16 19 18 20 20 L 20 26"/>
  <path d="M 25 28 C 25 26 27 25 29 23 C 31 21 32 18 30 17 C 28 16 26 18 25 20 L 25 26"/>
  <path d="M 22.5 26 L 22.5 14" stroke-width="1.5" fill="none"/>
  <line x1="19" y1="17" x2="26" y2="17" stroke-width="1.5"/>
  <line x1="20" y1="22" x2="17.5" y2="21" stroke-width="1"/>
  <line x1="25" y1="22" x2="27.5" y2="21" stroke-width="1"/>
  <line x1="20" y1="32" x2="17.5" y2="31" stroke-width="1"/>
  <line x1="25" y1="32" x2="27.5" y2="31" stroke-width="1"/>
  <line x1="15" y1="19" x2="13" y2="18" stroke-width="1"/>
  <line x1="30" y1="19" x2="32" y2="18" stroke-width="1"/>
</g></svg>`,

    // === БЕЛЫЙ ФЕРЗЬ — Высокий кактус с цветочной короной (5 лепестков) ===
    'Q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#c8f0be" stroke="#2a6820" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="38.5" width="25" height="3.5" rx="1.75"/>
  <path d="M 20 38.5 L 20 22 Q 20 20 22.5 20 Q 25 20 25 22 L 25 38.5 Z"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(0 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(72 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(144 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(216 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(288 22.5 20)"/>
  <circle cx="22.5" cy="20" r="3.5"/>
  <line x1="20" y1="26" x2="17.5" y2="25" stroke-width="1"/>
  <line x1="25" y1="26" x2="27.5" y2="25" stroke-width="1"/>
  <line x1="20" y1="32" x2="17.5" y2="31" stroke-width="1"/>
  <line x1="25" y1="32" x2="27.5" y2="31" stroke-width="1"/>
</g></svg>`,

    // === БЕЛАЯ ЛАДЬЯ — Бочкообразный кактус с 3 пучками колючек наверху ===
    'R': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#c8f0be" stroke="#2a6820" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="9" y="38.5" width="27" height="3.5" rx="1.75"/>
  <path d="M 14 38.5 L 14 21 Q 14 9 22.5 9 Q 31 9 31 21 L 31 38.5 Z"/>
  <path d="M 22.5 9 L 22.5 38.5" fill="none" stroke-width="0.75"/>
  <path d="M 18 10 Q 16.5 24 18 38.5" fill="none" stroke-width="0.75"/>
  <path d="M 27 10 Q 28.5 24 27 38.5" fill="none" stroke-width="0.75"/>
  <path d="M 14.5 19 Q 13.5 28 15 36" fill="none" stroke-width="0.75"/>
  <path d="M 30.5 19 Q 31.5 28 30 36" fill="none" stroke-width="0.75"/>
  <line x1="16" y1="25" x2="14" y2="25" fill="none" stroke-width="0.75"/>
  <line x1="29" y1="25" x2="31" y2="25" fill="none" stroke-width="0.75"/>
  <line x1="16" y1="31" x2="14" y2="31" fill="none" stroke-width="0.75"/>
  <line x1="29" y1="31" x2="31" y2="31" fill="none" stroke-width="0.75"/>
  <line x1="16.5" y1="10" x2="15" y2="7" stroke-width="1"/>
  <line x1="17" y1="10" x2="16" y2="7.5" stroke-width="1"/>
  <line x1="22.5" y1="9" x2="22.5" y2="6" stroke-width="1"/>
  <line x1="23" y1="9.5" x2="24" y2="6.5" stroke-width="1"/>
  <line x1="22" y1="9.5" x2="21" y2="6.5" stroke-width="1"/>
  <line x1="28.5" y1="10" x2="30" y2="7" stroke-width="1"/>
  <line x1="28" y1="10" x2="29" y2="7.5" stroke-width="1"/>
</g></svg>`,

    // === БЕЛЫЙ СЛОН — Высокий колонновидный кактус, развилка наверху ===
    'B': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#c8f0be" stroke="#2a6820" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="11" y="38.5" width="23" height="3.5" rx="1.75"/>
  <path d="M 20 38.5 L 20 24 Q 20 21 22.5 21 Q 25 21 25 24 L 25 38.5 Z"/>
  <path d="M 20 24 C 20 22 19 19 18 16 C 17 13 17.5 11 19.5 11 C 21 11 21.5 12.5 22 14 L 22 22"/>
  <path d="M 25 24 C 25 22 26 19 27 16 C 28 13 27.5 11 25.5 11 C 24 11 23.5 12.5 23 14 L 23 22"/>
  <circle cx="22.5" cy="22" r="2.5"/>
  <line x1="20" y1="28" x2="17.5" y2="27" stroke-width="1"/>
  <line x1="25" y1="28" x2="27.5" y2="27" stroke-width="1"/>
  <line x1="20" y1="34" x2="17.5" y2="33" stroke-width="1"/>
  <line x1="25" y1="34" x2="27.5" y2="33" stroke-width="1"/>
  <line x1="18" y1="17" x2="16" y2="16.5" stroke-width="1"/>
  <line x1="27" y1="17" x2="29" y2="16.5" stroke-width="1"/>
</g></svg>`,

    // === БЕЛЫЙ КОНЬ — Опунция «кроличьи уши» (два овала) ===
    'N': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#c8f0be" stroke="#2a6820" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="11" y="38.5" width="23" height="3.5" rx="1.75"/>
  <ellipse cx="22.5" cy="35" rx="5.5" ry="3"/>
  <ellipse cx="16.5" cy="25" rx="6.5" ry="9.5"/>
  <ellipse cx="28.5" cy="25" rx="6.5" ry="9.5"/>
  <line x1="10" y1="22" x2="12" y2="23.5" stroke-width="1"/>
  <line x1="10" y1="27" x2="12" y2="26" stroke-width="1"/>
  <line x1="13.5" y1="16.5" x2="14.5" y2="14.5" stroke-width="1"/>
  <line x1="16.5" y1="15.5" x2="16.5" y2="13.5" stroke-width="1"/>
  <line x1="35" y1="22" x2="33" y2="23.5" stroke-width="1"/>
  <line x1="35" y1="27" x2="33" y2="26" stroke-width="1"/>
  <line x1="31.5" y1="16.5" x2="30.5" y2="14.5" stroke-width="1"/>
  <line x1="28.5" y1="15.5" x2="28.5" y2="13.5" stroke-width="1"/>
</g></svg>`,

    // === БЕЛАЯ ПЕШКА — Маленький круглый кактус с колючками ===
    'P': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#c8f0be" stroke="#2a6820" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="12" y="38.5" width="21" height="3.5" rx="1.75"/>
  <rect x="20" y="35" width="5" height="4" rx="1"/>
  <ellipse cx="22.5" cy="26.5" rx="7.5" ry="9"/>
  <line x1="15.5" y1="23.5" x2="13" y2="22" stroke-width="1"/>
  <line x1="15" y1="28.5" x2="12.5" y2="29" stroke-width="1"/>
  <line x1="29.5" y1="23.5" x2="32" y2="22" stroke-width="1"/>
  <line x1="30" y1="28.5" x2="32.5" y2="29" stroke-width="1"/>
  <line x1="22.5" y1="17.5" x2="22.5" y2="15" stroke-width="1"/>
  <path d="M 22.5 17.5 Q 22.5 26.5 22.5 35.5" fill="none" stroke-width="0.75"/>
</g></svg>`,

    // === ЧЁРНЫЙ КОРОЛЬ — Сагуаро с поднятыми руками + крест наверху ===
    'k': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#2a6820" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="38.5" width="25" height="3.5" rx="1.75"/>
  <path d="M 20 38.5 L 20 28 Q 20 26 22.5 26 Q 25 26 25 28 L 25 38.5 Z"/>
  <path d="M 20 28 C 20 26 18 25 16 23 C 14 21 13 18 15 17 C 17 16 19 18 20 20 L 20 26"/>
  <path d="M 25 28 C 25 26 27 25 29 23 C 31 21 32 18 30 17 C 28 16 26 18 25 20 L 25 26"/>
  <path d="M 22.5 26 L 22.5 14" stroke-width="1.5" fill="none"/>
  <line x1="19" y1="17" x2="26" y2="17" stroke-width="1.5"/>
  <line x1="20" y1="22" x2="17.5" y2="21" stroke="#7dc96e" stroke-width="1"/>
  <line x1="25" y1="22" x2="27.5" y2="21" stroke="#7dc96e" stroke-width="1"/>
  <line x1="20" y1="32" x2="17.5" y2="31" stroke="#7dc96e" stroke-width="1"/>
  <line x1="25" y1="32" x2="27.5" y2="31" stroke="#7dc96e" stroke-width="1"/>
  <line x1="15" y1="19" x2="13" y2="18" stroke="#7dc96e" stroke-width="1"/>
  <line x1="30" y1="19" x2="32" y2="18" stroke="#7dc96e" stroke-width="1"/>
</g></svg>`,

    // === ЧЁРНЫЙ ФЕРЗЬ — Высокий кактус с цветочной короной ===
    'q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#2a6820" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="38.5" width="25" height="3.5" rx="1.75"/>
  <path d="M 20 38.5 L 20 22 Q 20 20 22.5 20 Q 25 20 25 22 L 25 38.5 Z"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(0 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(72 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(144 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(216 22.5 20)"/>
  <ellipse cx="22.5" cy="14" rx="2.5" ry="4" transform="rotate(288 22.5 20)"/>
  <circle cx="22.5" cy="20" r="3.5"/>
  <line x1="20" y1="26" x2="17.5" y2="25" stroke="#7dc96e" stroke-width="1"/>
  <line x1="25" y1="26" x2="27.5" y2="25" stroke="#7dc96e" stroke-width="1"/>
  <line x1="20" y1="32" x2="17.5" y2="31" stroke="#7dc96e" stroke-width="1"/>
  <line x1="25" y1="32" x2="27.5" y2="31" stroke="#7dc96e" stroke-width="1"/>
</g></svg>`,

    // === ЧЁРНАЯ ЛАДЬЯ — Бочкообразный кактус с пучками колючек наверху ===
    'r': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#2a6820" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="9" y="38.5" width="27" height="3.5" rx="1.75"/>
  <path d="M 14 38.5 L 14 21 Q 14 9 22.5 9 Q 31 9 31 21 L 31 38.5 Z"/>
  <path d="M 22.5 9 L 22.5 38.5" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <path d="M 18 10 Q 16.5 24 18 38.5" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <path d="M 27 10 Q 28.5 24 27 38.5" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <path d="M 14.5 19 Q 13.5 28 15 36" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <path d="M 30.5 19 Q 31.5 28 30 36" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <line x1="16" y1="25" x2="14" y2="25" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <line x1="29" y1="25" x2="31" y2="25" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <line x1="16" y1="31" x2="14" y2="31" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <line x1="29" y1="31" x2="31" y2="31" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
  <line x1="16.5" y1="10" x2="15" y2="7" stroke="#7dc96e" stroke-width="1"/>
  <line x1="17" y1="10" x2="16" y2="7.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="22.5" y1="9" x2="22.5" y2="6" stroke="#7dc96e" stroke-width="1"/>
  <line x1="23" y1="9.5" x2="24" y2="6.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="22" y1="9.5" x2="21" y2="6.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="28.5" y1="10" x2="30" y2="7" stroke="#7dc96e" stroke-width="1"/>
  <line x1="28" y1="10" x2="29" y2="7.5" stroke="#7dc96e" stroke-width="1"/>
</g></svg>`,

    // === ЧЁРНЫЙ СЛОН — Высокий колонновидный кактус, развилка наверху ===
    'b': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#2a6820" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="11" y="38.5" width="23" height="3.5" rx="1.75"/>
  <path d="M 20 38.5 L 20 24 Q 20 21 22.5 21 Q 25 21 25 24 L 25 38.5 Z"/>
  <path d="M 20 24 C 20 22 19 19 18 16 C 17 13 17.5 11 19.5 11 C 21 11 21.5 12.5 22 14 L 22 22"/>
  <path d="M 25 24 C 25 22 26 19 27 16 C 28 13 27.5 11 25.5 11 C 24 11 23.5 12.5 23 14 L 23 22"/>
  <circle cx="22.5" cy="22" r="2.5"/>
  <line x1="20" y1="28" x2="17.5" y2="27" stroke="#7dc96e" stroke-width="1"/>
  <line x1="25" y1="28" x2="27.5" y2="27" stroke="#7dc96e" stroke-width="1"/>
  <line x1="20" y1="34" x2="17.5" y2="33" stroke="#7dc96e" stroke-width="1"/>
  <line x1="25" y1="34" x2="27.5" y2="33" stroke="#7dc96e" stroke-width="1"/>
  <line x1="18" y1="17" x2="16" y2="16.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="27" y1="17" x2="29" y2="16.5" stroke="#7dc96e" stroke-width="1"/>
</g></svg>`,

    // === ЧЁРНЫЙ КОНЬ — Опунция «кроличьи уши» ===
    'n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#2a6820" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="11" y="38.5" width="23" height="3.5" rx="1.75"/>
  <ellipse cx="22.5" cy="35" rx="5.5" ry="3"/>
  <ellipse cx="16.5" cy="25" rx="6.5" ry="9.5"/>
  <ellipse cx="28.5" cy="25" rx="6.5" ry="9.5"/>
  <line x1="10" y1="22" x2="12" y2="23.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="10" y1="27" x2="12" y2="26" stroke="#7dc96e" stroke-width="1"/>
  <line x1="13.5" y1="16.5" x2="14.5" y2="14.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="16.5" y1="15.5" x2="16.5" y2="13.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="35" y1="22" x2="33" y2="23.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="35" y1="27" x2="33" y2="26" stroke="#7dc96e" stroke-width="1"/>
  <line x1="31.5" y1="16.5" x2="30.5" y2="14.5" stroke="#7dc96e" stroke-width="1"/>
  <line x1="28.5" y1="15.5" x2="28.5" y2="13.5" stroke="#7dc96e" stroke-width="1"/>
</g></svg>`,

    // === ЧЁРНАЯ ПЕШКА — Маленький круглый кактус ===
    'p': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
<g fill="#2a6820" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="12" y="38.5" width="21" height="3.5" rx="1.75"/>
  <rect x="20" y="35" width="5" height="4" rx="1"/>
  <ellipse cx="22.5" cy="26.5" rx="7.5" ry="9"/>
  <line x1="15.5" y1="23.5" x2="13" y2="22" stroke="#7dc96e" stroke-width="1"/>
  <line x1="15" y1="28.5" x2="12.5" y2="29" stroke="#7dc96e" stroke-width="1"/>
  <line x1="29.5" y1="23.5" x2="32" y2="22" stroke="#7dc96e" stroke-width="1"/>
  <line x1="30" y1="28.5" x2="32.5" y2="29" stroke="#7dc96e" stroke-width="1"/>
  <line x1="22.5" y1="17.5" x2="22.5" y2="15" stroke="#7dc96e" stroke-width="1"/>
  <path d="M 22.5 17.5 Q 22.5 26.5 22.5 35.5" fill="none" stroke="#7dc96e" stroke-width="0.75"/>
</g></svg>`

};
