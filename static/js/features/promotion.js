// static/js/features/promotion.js
// ============================================
// ПРЕВРАЩЕНИЕ ПЕШКИ
// ============================================

(function () {
    // --- Инжектим модалку и стили один раз при загрузке ---
    function injectDom() {
        if (document.getElementById('promotionModal')) return;

        const style = document.createElement('style');
        style.textContent = `
            .promotion-overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.65);
                display: none; align-items: center; justify-content: center;
                z-index: 200;
            }
            .promotion-overlay.visible { display: flex; }
            .promotion-box {
                background: #1e1e1e;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 20px 24px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                text-align: center;
            }
            .promotion-title { color: #e0e0e0; font-size: 14px; margin-bottom: 14px; }
            .promotion-choices { display: flex; gap: 10px; }
            .promotion-btn {
                width: 64px; height: 64px;
                background-color: rgba(255,255,255,0.05);
                background-size: 70%; background-repeat: no-repeat; background-position: center;
                border: 2px solid rgba(255,255,255,0.15);
                border-radius: 8px; cursor: pointer; transition: all .15s ease;
            }
            .promotion-btn:hover {
                border-color: #ffd700;
                box-shadow: 0 0 15px rgba(255,215,0,0.3);
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'promotionModal';
        overlay.className = 'promotion-overlay';
        overlay.innerHTML = `
            <div class="promotion-box">
                <div class="promotion-title">Выберите фигуру</div>
                <div class="promotion-choices">
                    <button class="promotion-btn" data-piece="q" title="Ферзь"></button>
                    <button class="promotion-btn" data-piece="r" title="Ладья"></button>
                    <button class="promotion-btn" data-piece="b" title="Слон"></button>
                    <button class="promotion-btn" data-piece="n" title="Конь"></button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function isPromotionMove(piece, toRow) {
        return (piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7);
    }

    function ask(color) {
        injectDom();
        const overlay = document.getElementById('promotionModal');
        const buttons = overlay.querySelectorAll('.promotion-btn');

        buttons.forEach((btn) => {
            const key = color === 'white'
                ? btn.dataset.piece.toUpperCase()
                : btn.dataset.piece;
            if (typeof PIECES_SVG !== 'undefined' && PIECES_SVG[key]) {
                btn.style.backgroundImage =
                    `url("data:image/svg+xml,${encodeURIComponent(PIECES_SVG[key])}")`;
            }
        });

        return new Promise((resolve) => {
            function handler(e) {
                const btn = e.target.closest('.promotion-btn');
                if (!btn) return;
                overlay.classList.remove('visible');
                buttons.forEach((b) => b.removeEventListener('click', handler));
                resolve(btn.dataset.piece); // 'q' | 'r' | 'b' | 'n'
            }
            buttons.forEach((b) => b.addEventListener('click', handler));
            overlay.classList.add('visible');
        });
    }

    // Публичный API модуля — по аналогии с window.undoManager / window.chessRules
    window.pawnPromotion = {
        isPromotionMove,
        ask, // async -> 'q'|'r'|'b'|'n'
    };

    document.addEventListener('DOMContentLoaded', injectDom);
})();