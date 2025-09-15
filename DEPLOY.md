# Деплой бота

## Настройка VPS

1. **Установите Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

2. **Установите Docker Compose (если нужно):**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Создайте директорию проекта:**
   ```bash
   mkdir -p /opt/bot && cd /opt/bot
   ```

4. **Создайте файл `.env`** с вашими настройками:
   ```env
   # Обязательные параметры
   GITHUB_REPOSITORY=your-username/your-repo-name
   BOT_TOKEN=your_bot_token_here
   BOT_USERNAME=your_bot_username
   PORT=8080
   API_SECRET_KEY=your_api_secret_key_here

   # Опциональные параметры  
   API_BASE_URL=https://your-api-domain.com/api/v2
   MINI_APP_URL=https://your-mini-app-domain.com/webapp
   LOG_CHANNEL_ID=your_channel_id
   WEBHOOK_URL=https://your-domain.com/bot-webhook
   TELEGRAM_SECRET_TOKEN=your_secret_token_here
   ```

✅ **docker-compose.yml создается автоматически при деплое**

## Настройка Nginx

Добавьте в ваш Nginx конфиг роут для webhook'а бота:

```nginx
# Webhook для Telegram бота
location /bot-webhook/ {
    proxy_pass http://127.0.0.1:YOUR_PORT_FROM_ENV/;  # Замените на ваш порт из .env
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 30s;
    proxy_connect_timeout 5s;
}
```

После изменений перезагрузите Nginx:
```bash
nginx -t && systemctl reload nginx
```

## Настройка GitHub Secrets

В настройках репозитория добавьте секреты:
- `VPS_HOST` - IP адрес VPS
- `VPS_USER` - пользователь SSH (root/ubuntu)  
- `VPS_SSH_KEY` - приватный SSH ключ
- `BOT_PORT` - **порт для бота (тот же что в .env файле)**
- `API_SECRET_KEY` - **секретный ключ для API аутентификации (обязательно)**
- `TELEGRAM_SECRET_TOKEN` - **секретный токен для защиты webhook (опционально)**

### Генерация секретных ключей

**API_SECRET_KEY (обязательно):**
```bash
# Генерируем случайную строку (32 символа)
openssl rand -hex 16

# Или используйте Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**TELEGRAM_SECRET_TOKEN (опционально):**
```bash
# Генерируем случайную строку (32 символа)
openssl rand -hex 16

# Или используйте Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

⚠️ **Важно:** 
- Убедитесь что `BOT_PORT` в GitHub Secrets совпадает с `PORT` в `.env` файле на VPS!
- `API_SECRET_KEY` должен совпадать в GitHub Secrets и `.env` файле на VPS!
- `TELEGRAM_SECRET_TOKEN` должен совпадать в GitHub Secrets и `.env` файле на VPS!
- API_SECRET_KEY защищает эндпоинт `/api/payment-log` от несанкционированных запросов
- TELEGRAM_SECRET_TOKEN защищает webhook от несанкционированных запросов

## Деплой

Push в ветку `main` автоматически запустит деплой.

## Управление

```bash
# Логи
docker compose logs -f

# Перезапуск
docker compose restart

# Обновление
docker compose pull && docker compose up -d
```
