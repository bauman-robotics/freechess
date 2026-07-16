// static/js/utils/dom.js

// ============================================
// DOM УТИЛИТЫ
// ============================================

/**
 * Создаёт элемент с классами и атрибутами
 * @param {string} tag - HTML тег
 * @param {Object} options - Опции
 * @param {string|Array} options.className - Класс или массив классов
 * @param {Object} options.attrs - Атрибуты
 * @param {string} options.text - Текстовое содержимое
 * @param {string} options.html - HTML содержимое
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    
    if (options.className) {
        if (Array.isArray(options.className)) {
            el.classList.add(...options.className);
        } else {
            el.className = options.className;
        }
    }
    
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    }
    
    if (options.text) {
        el.textContent = options.text;
    }
    
    if (options.html) {
        el.innerHTML = options.html;
    }
    
    if (options.id) {
        el.id = options.id;
    }
    
    if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
            el.dataset[key] = value;
        });
    }
    
    return el;
}

/**
 * Находит элемент или создаёт, если не найден
 * @param {string} selector - CSS селектор
 * @param {string} tag - HTML тег для создания
 * @param {Object} options - Опции для createElement
 * @param {HTMLElement} parent - Родительский элемент
 * @returns {HTMLElement}
 */
export function findOrCreate(selector, tag = 'div', options = {}, parent = document.body) {
    let el = document.querySelector(selector);
    if (!el) {
        el = createElement(tag, options);
        parent.appendChild(el);
    }
    return el;
}

/**
 * Добавляет/удаляет класс у элемента
 * @param {HTMLElement|string} el - Элемент или селектор
 * @param {string} className - Имя класса
 * @param {boolean} add - Добавить или удалить
 */
export function toggleClass(el, className, add) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (!element) return;
    
    if (add === undefined) {
        element.classList.toggle(className);
    } else if (add) {
        element.classList.add(className);
    } else {
        element.classList.remove(className);
    }
}

/**
 * Проверяет наличие класса у элемента
 * @param {HTMLElement|string} el - Элемент или селектор
 * @param {string} className - Имя класса
 * @returns {boolean}
 */
export function hasClass(el, className) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    return element ? element.classList.contains(className) : false;
}

/**
 * Устанавливает текст элемента
 * @param {HTMLElement|string} el - Элемент или селектор
 * @param {string} text - Текст
 */
export function setText(el, text) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (element) {
        element.textContent = text;
    }
}

/**
 * Получает текст элемента
 * @param {HTMLElement|string} el - Элемент или селектор
 * @returns {string}
 */
export function getText(el) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    return element ? element.textContent : '';
}

/**
 * Очищает содержимое элемента
 * @param {HTMLElement|string} el - Элемент или селектор
 */
export function clearElement(el) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (element) {
        element.innerHTML = '';
    }
}

/**
 * Скрывает или показывает элемент
 * @param {HTMLElement|string} el - Элемент или селектор
 * @param {boolean} show - Показать или скрыть
 */
export function setVisible(el, show) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (element) {
        element.style.display = show ? '' : 'none';
    }
}

/**
 * Проверяет видимость элемента
 * @param {HTMLElement|string} el - Элемент или селектор
 * @returns {boolean}
 */
export function isVisible(el) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    return element ? element.style.display !== 'none' : false;
}

/**
 * Загружает скрипт динамически
 * @param {string} src - URL скрипта
 * @param {Function} callback - Функция после загрузки
 */
export function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = () => {
        console.error(`❌ Ошибка загрузки скрипта: ${src}`);
    };
    document.head.appendChild(script);
}

/**
 * Загружает стиль динамически
 * @param {string} href - URL стиля
 */
export function loadStylesheet(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

/**
 * Делает элемент кликабельным для копирования текста
 * @param {HTMLElement|string} el - Элемент или селектор
 * @param {string} text - Текст для копирования (опционально)
 */
export function makeCopyable(el, text) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (!element) return;
    
    element.addEventListener('click', () => {
        const copyText = text || element.textContent;
        if (!copyText || copyText === '—') return;
        
        navigator.clipboard.writeText(copyText)
            .then(() => {
                if (typeof showToast === 'function') {
                    showToast('📋 Скопировано!', 'success');
                }
            })
            .catch(() => {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = copyText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                if (typeof showToast === 'function') {
                    showToast('📋 Скопировано!', 'success');
                }
            });
    });
    
    element.style.cursor = 'pointer';
    element.title = 'Кликните чтобы скопировать';
}

/**
 * Плавно скроллит элемент в видимую область
 * @param {HTMLElement|string} el - Элемент или селектор
 * @param {Object} options - Опции скролла
 */
export function scrollToElement(el, options = {}) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (!element) return;
    
    element.scrollIntoView({
        behavior: 'smooth',
        block: options.block || 'center',
        inline: options.inline || 'nearest'
    });
}

/**
 * Создаёт делегирование событий
 * @param {HTMLElement} parent - Родительский элемент
 * @param {string} event - Имя события
 * @param {string} selector - CSS селектор для делегирования
 * @param {Function} handler - Обработчик
 */
export function delegateEvent(parent, event, selector, handler) {
    parent.addEventListener(event, function(e) {
        const target = e.target.closest(selector);
        if (target) {
            handler.call(target, e);
        }
    });
}

/**
 * Получает координаты элемента относительно документа
 * @param {HTMLElement} el - Элемент
 * @returns {Object} - { top, left, width, height }
 */
export function getElementRect(el) {
    const rect = el.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
    };
}

// Экспорт по умолчанию
export default {
    createElement,
    findOrCreate,
    toggleClass,
    hasClass,
    setText,
    getText,
    clearElement,
    setVisible,
    isVisible,
    loadScript,
    loadStylesheet,
    makeCopyable,
    scrollToElement,
    delegateEvent,
    getElementRect
};