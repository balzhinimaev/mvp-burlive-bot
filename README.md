# Бурятский язык - Telegram Bot

Простой Telegram бот на вебхуках для работы с Mini App. Обеспечивает регистрацию и вовлечение пользователей в Mini App, сбор UTM параметров как лидов и быстрый переход в Mini App.

## Возможности

- ✅ Обработка команд `/start` и `/help`
- ✅ Парсинг UTM параметров из deep-link payload
- ✅ Отправка лидов на бэкенд API (`POST /api/v2/leads/bot_start`)
- ✅ Создание startapp ссылок для Mini App с передачей UTM
- ✅ Поддержка как startapp deep links, так и WebApp кнопок
- ✅ Webhook поддержка для продакшена
- ✅ Логирование активности пользователей в Telegram канал
- ✅ Comprehensive logging и error handling

## Технический стек

- **Node.js** с TypeScript
- **Telegraf** - фреймворк для Telegram ботов
- **Axios** - HTTP клиент для API запросов
- **dotenv** - управление конфигурацией

## Быстрый старт

### 1. Установка

```bash
npm install
```

### 2. Конфигурация

Создайте файл `.env` с следующими параметрами:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username_here

# API Configuration
API_BASE_URL=https://burlive.ru/api/v2

# Mini App Configuration
MINI_APP_STARTAPP_ENABLED=true
MINI_APP_URL=https://your-mini-app-domain.com

# Server Configuration
PORT=3000
WEBHOOK_PATH=/webhook

# Production only: Webhook URL for production deployment
# WEBHOOK_URL=https://your-bot-domain.com

# Logging Configuration
LOG_LEVEL=info

# Channel Logging Configuration
LOG_CHANNEL_ENABLED=true
LOG_CHANNEL_ID=-1001234567890

# Optional: Error Tracking
# SENTRY_DSN=your_sentry_dsn_here
```

### 3. Запуск

```bash
# Разработка
npm run dev

# Продакшн
npm run build && npm start
```

## Использование

### Deep Link формат

Бот поддерживает UTM параметры в payload:

```
t.me/your_bot?start=us=vk&uc=launch&promo=BURI79
```

Поддерживаемые параметры:
- `us`, `utm_source` - источник трафика
- `um`, `utm_medium` - медиум  
- `uc`, `utm_campaign` - кампания
- `ut`, `utm_term` - ключевое слово
- `ucn`, `utm_content` - содержание
- `promo`, `promo_id` - промокод

### API интеграция

Бот отправляет лиды на эндпоинт:

```
POST /api/v2/leads/bot_start
```

С телом запроса:
```json
{
  "userId": 12345,
  "utm": {
    "utm_source": "vk", 
    "utm_campaign": "launch"
  },
  "promoId": "BURI79"
}
```

### Mini App интеграция

Бот создает ссылки для запуска Mini App:

**Вариант A (предпочтительно):** startapp deep link
```
https://t.me/bot?startapp=us%3Dvk%26uc%3Dlaunch
```

**Вариант B:** WebApp кнопка с прямой ссылкой

## Команды

- `/start [payload]` - Приветствие + кнопка запуска Mini App
- `/help` - Справка + кнопка запуска Mini App

## Архитектура

```
src/
├── index.ts          # Основной файл бота с обработчиками
├── config.ts         # Конфигурация из переменных окружения
├── api.ts            # API сервис для отправки лидов  
├── utils.ts          # Утилиты для парсинга UTM и создания ссылок
├── types.ts          # TypeScript типы
├── channel-logger.ts # Логирование в Telegram канал
└── telegraf.d.ts     # Декларации типов для telegraf
```

## Deployment

### Development
```bash
npm run dev  # Long polling
```

### Production
Автоматический деплой через GitHub Actions при push в `main` ветку.

## Логирование

Все действия логируются с метаданными:
- Входящие сообщения
- Парсинг UTM параметров
- API запросы и ответы
- Ошибки с контекстом

Уровень логирования настраивается через `LOG_LEVEL`.

## Логирование в Telegram канал

Бот может автоматически логировать все нажатия команды `/start` в указанный Telegram канал для мониторинга активности пользователей.

### Настройка канала логов

1. **Создайте канал** или используйте существующий
2. **Добавьте бота в канал** как администратора с правами отправки сообщений
3. **Получите Chat ID канала:**
   - Для публичных каналов: используйте `@channel_username`
   - Для приватных каналов: используйте числовой ID (например, `-1001234567890`)
4. **Установите переменные окружения:**
   ```env
   LOG_CHANNEL_ENABLED=true
   LOG_CHANNEL_ID=-1001234567890  # или @your_channel_username
   ```

### Что логируется

При каждом нажатии `/start` в канал отправляется сообщение с:
- 🆕/🔄 Статус (новый пользователь или повторный запуск)
- 👤 Имя и username пользователя
- 🆔 User ID
- 📊 UTM параметры (source, campaign, medium, etc.)
- 🎫 Промокод (если есть)
- 🕒 Время в московском часовом поясе

### Пример лог-сообщения

```
🆕 Новый пользователь

👤 Пользователь: Иван Иванов (@ivan_user)
🆔 ID: 123456789
📊 UTM: source: vk, campaign: launch
🎫 Промо: BURI79
🕒 Время: 03.09.2025, 15:30 (МСК)
```

## Безопасность

- ✅ Не принимает критических решений (доступ/платежи)
- ✅ Таймауты API запросов (3 сек)
- ✅ Не блокирует UX при ошибках API
- ✅ Идемпотентные API запросы

## Лицензия

ISC
