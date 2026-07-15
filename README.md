# Шахматы Песочница (Chess Sandbox Game)

Проект представляет собой веб-приложение на базе Flask + SocketIO для игры в шахматы с реальным временем.

## 📁 Структура проекта

/root/freechess/
├── app.py # Основной файл приложения (Flask + SocketIO)
├── start.py # Точка входа для продакшена (debug=False)
├── run.sh # Универсальный скрипт управления (запуск/остановка/статус)
├── start_daemon.sh # Обёртка для запуска через systemd
├── requirements.txt # Python зависимости
├── venv/ # Виртуальное окружение Python
├── /var/log/chess.log # Логи приложения (стандартный вывод)
└── /var/log/chess_error.log # Логи ошибок приложения
text


---

## 🚀 Запуск приложения

### 1️⃣ Ручной запуск (для разработки)
```bash
cd /root/freechess
./run.sh start

Приложение запустится на http://0.0.0.0:8000 в режиме debug=True (авто-перезагрузка при изменении кода).
2️⃣ Запуск через systemd (для продакшена)

Сервис автоматически запускается при старте системы и перезапускается в случае сбоя.
bash

sudo systemctl start chess.service   # Запустить
sudo systemctl stop chess.service    # Остановить
sudo systemctl restart chess.service # Перезапустить
sudo systemctl status chess.service  # Проверить статус

3️⃣ Проверка работы
bash

curl -v http://localhost:8000/

📋 Управление через run.sh

Скрипт run.sh предоставляет удобные команды для управления приложением:
Команда	Описание
./run.sh start	Запустить сервер (ручной режим)
./run.sh stop	Остановить сервер
./run.sh restart	Перезапустить сервер
./run.sh status	Проверить, запущен ли сервер
./run.sh install	Установить зависимости в виртуальное окружение
./run.sh clean	Удалить виртуальное окружение и кэш
./run.sh help	Показать справку
🛠️ Отладка
1. Просмотр логов приложения
bash

sudo tail -f /var/log/chess.log       # Стандартные логи
sudo tail -f /var/log/chess_error.log # Логи ошибок

2. Просмотр логов systemd
bash

sudo journalctl -u chess.service -f   # Логи в реальном времени
sudo journalctl -u chess.service -n 50 # Последние 50 строк

3. Проверка, слушает ли приложение порт
bash

sudo lsof -i :8000

4. Проверка статуса сервиса
bash

sudo systemctl status chess.service

5. Проверка конфигурации NGINX (если используется)
bash

sudo nginx -t
sudo systemctl reload nginx

⚙️ Настройка systemd (для продакшена)
Файл сервиса: /etc/systemd/system/chess.service
ini

[Unit]
Description=Chess Sandbox Game
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/freechess
Environment="PATH=/root/freechess/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/root/freechess/venv/bin/python3 /root/freechess/start.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/chess.log
StandardError=append:/var/log/chess_error.log

[Install]
WantedBy=multi-user.target

После изменения файла сервиса выполните:
bash

sudo systemctl daemon-reload
sudo systemctl restart chess.service

🔧 Решение типичных проблем
Ошибка 502 Bad Gateway

    Приложение не запущено: sudo systemctl status chess.service

    Порт не слушается: sudo lsof -i :8000

    NGINX проксирует не на тот порт: проверьте proxy_pass в конфиге NGINX

Сервис не запускается (ошибка 203/EXEC)

    Нет прав на выполнение скрипта: chmod +x /root/freechess/start_daemon.sh

    В сервисе указан неверный путь: проверьте ExecStart

Сервис запускается и сразу завершается

    В app.py включён debug=True — используйте start.py для продакшена

    Ошибка в коде приложения — проверьте логи: sudo journalctl -u chess.service -f

📌 Важные отличия режимов запуска
Режим	Файл	debug	Авто-перезагрузка	Для чего
Разработка	./run.sh start → app.py	True	✅	Внесение изменений в код
Продакшен	systemd → start.py	False	❌	Стабильная работа сервера
🌐 Порты
Сервис	Порт
Chess приложение	8000
NGINX (HTTP)	80
NGINX (HTTPS)	443
📝 Полезные команды
bash

# Перезапуск всего стека
sudo systemctl restart chess.service && sudo systemctl reload nginx

# Просмотр всех логов в реальном времени
sudo journalctl -u chess.service -f -o cat

# Проверка использования CPU и памяти
sudo systemctl status chess.service

# Полная переустановка
./run.sh clean && ./run.sh install && ./run.sh start

👨‍💻 Поддержка

При возникновении проблем:

    Проверьте статус сервиса: sudo systemctl status chess.service

    Посмотрите логи: sudo journalctl -u chess.service -f

    Проверьте порт: sudo lsof -i :8000

    Проверьте конфиг NGINX: sudo nginx -t