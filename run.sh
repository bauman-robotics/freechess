#!/bin/bash

# ============================================
# Шахматы Песочница - Скрипт запуска
# ============================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Настройки
APP_NAME="Шахматы Песочница"
VENV_DIR="venv"
APP_FILE="app.py"
PORT=8000

# Функция для вывода сообщений
print_message() {
    echo -e "${BLUE}[${APP_NAME}]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_header() {
    echo ""
    echo "============================================"
    echo "  $1"
    echo "============================================"
    echo ""
}

# Проверка наличия Python
check_python() {
    print_message "Проверка установки Python..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        print_success "Python 3 найден: $(python3 --version)"
        return 0
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
        print_success "Python найден: $(python --version)"
        return 0
    else
        print_error "Python не найден! Установите Python 3.7 или выше."
        exit 1
    fi
}

# Создание виртуального окружения
create_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        print_message "Создание виртуального окружения..."
        $PYTHON_CMD -m venv $VENV_DIR
        
        if [ $? -eq 0 ]; then
            print_success "Виртуальное окружение создано в папке $VENV_DIR"
        else
            print_error "Не удалось создать виртуальное окружение"
            exit 1
        fi
    else
        print_success "Виртуальное окружение уже существует"
    fi
}

# Проверка и установка зависимостей
install_dependencies() {
    print_message "Проверка зависимостей..."
    
    # Активируем виртуальное окружение
    source $VENV_DIR/bin/activate
    
    # Проверяем наличие requirements.txt
    if [ ! -f "requirements.txt" ]; then
        print_warning "Файл requirements.txt не найден! Создаю..."
        cat > requirements.txt << EOF
Flask==2.3.2
Flask-SocketIO==5.3.4
eventlet==0.33.3
EOF
        print_success "Файл requirements.txt создан"
    fi
    
    # Проверяем, установлены ли зависимости
    print_message "Проверка установленных пакетов..."
    
    # Проверяем Flask
    if pip show Flask &> /dev/null; then
        print_success "Все зависимости уже установлены"
    else
        print_message "Установка зависимостей из requirements.txt..."
        # НЕ обновляем pip, просто устанавливаем пакеты
        pip install -r requirements.txt --no-cache-dir
        
        if [ $? -eq 0 ]; then
            print_success "Зависимости установлены"
        else
            print_error "Ошибка при установке зависимостей"
            deactivate
            exit 1
        fi
    fi
    
    deactivate
}

# Проверка наличия app.py
check_app_file() {
    if [ ! -f "$APP_FILE" ]; then
        print_error "Файл $APP_FILE не найден!"
        print_message "Убедитесь, что вы находитесь в правильной директории"
        exit 1
    fi
    print_success "Файл $APP_FILE найден"
}

# Запуск приложения
run_app() {
    print_header "Запуск $APP_NAME"
    
    # Активируем виртуальное окружение
    source $VENV_DIR/bin/activate
    
    # Проверяем порт
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            print_warning "Порт $PORT уже используется!"
            print_message "Попробуйте закрыть программу, использующую этот порт"
            read -p "Хотите продолжить? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                deactivate
                exit 1
            fi
        fi
    fi
    
    print_success "Запуск сервера на http://localhost:$PORT"
    print_message "Нажмите Ctrl+C для остановки"
    echo ""
    
    # Запускаем Flask приложение
    $PYTHON_CMD $APP_FILE
}

# Остановка приложения
stop_app() {
    print_message "Остановка сервера..."
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti :$PORT)
        if [ ! -z "$PID" ]; then
            kill -9 $PID
            print_success "Сервер остановлен (PID: $PID)"
        else
            print_message "Сервер не запущен"
        fi
    else
        print_warning "lsof не найден, попробуйте остановить вручную"
    fi
}

# Проверка статуса
check_status() {
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            PID=$(lsof -ti :$PORT)
            print_success "Сервер запущен на порту $PORT (PID: $PID)"
            print_message "Откройте браузер: http://localhost:$PORT"
        else
            print_warning "Сервер не запущен"
        fi
    else
        print_warning "lsof не найден, не могу проверить статус"
    fi
}

# Помощь
show_help() {
    echo ""
    echo "Использование: ./run.sh [КОМАНДА]"
    echo ""
    echo "Команды:"
    echo "  start    - Запустить сервер"
    echo "  stop     - Остановить сервер"
    echo "  restart  - Перезапустить сервер"
    echo "  status   - Проверить статус сервера"
    echo "  install  - Только установить зависимости"
    echo "  clean    - Очистить виртуальное окружение"
    echo "  help     - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  ./run.sh start      # Запустить игру"
    echo "  ./run.sh stop       # Остановить игру"
    echo "  ./run.sh status     # Проверить статус"
    echo ""
}

# Очистка
clean_env() {
    print_message "Очистка виртуального окружения..."
    if [ -d "$VENV_DIR" ]; then
        rm -rf $VENV_DIR
        print_success "Виртуальное окружение удалено"
    else
        print_warning "Виртуальное окружение не найдено"
    fi
    
    # Удаляем временные файлы
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
    find . -type f -name "*.pyc" -delete 2>/dev/null
    
    print_success "Очистка завершена"
}

# ============================================
# Главная логика
# ============================================

# Обработка аргументов
case "$1" in
    start)
        check_python
        check_app_file
        create_venv
        install_dependencies
        run_app
        ;;
    
    stop)
        stop_app
        ;;
    
    restart)
        stop_app
        sleep 2
        check_python
        check_app_file
        create_venv
        install_dependencies
        run_app
        ;;
    
    status)
        check_status
        ;;
    
    install)
        check_python
        create_venv
        install_dependencies
        print_success "Готово! Запустите ./run.sh start"
        ;;
    
    clean)
        clean_env
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        # Если команда не указана, запускаем с проверкой
        if [ -z "$1" ]; then
            print_header "Запуск $APP_NAME"
            check_python
            check_app_file
            create_venv
            install_dependencies
            run_app
        else
            print_error "Неизвестная команда: $1"
            echo ""
            show_help
            exit 1
        fi
        ;;
esac

exit 0