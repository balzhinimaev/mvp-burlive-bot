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

4. **Создайте файл `.env`** с настройками:
   ```env
   GITHUB_REPOSITORY=username/buryat-telegram-bot
   BOT_TOKEN=your_bot_token
   BOT_USERNAME=your_bot_username
   API_BASE_URL=https://burlive.ru/api/v2
   MINI_APP_URL=https://burlive.ru/webapp
   LOG_CHANNEL_ID=-1002281903962
   WEBHOOK_URL=https://your-domain.com
   PORT=8080
   ```

5. **Скопируйте docker-compose.yml** из репозитория

## Настройка GitHub Secrets

В настройках репозитория добавьте секреты:
- `VPS_HOST` - IP адрес VPS
- `VPS_USER` - пользователь SSH (root/ubuntu)  
- `VPS_SSH_KEY` - приватный SSH ключ

## Деплой

Push в ветку `main` автоматически запустит деплой.

## Управление

```bash
# Логи
docker-compose logs -f

# Перезапуск
docker-compose restart

# Обновление
docker-compose pull && docker-compose up -d
```
