# API Документация

Документация по API эндпоинтам бота для логирования платежей и работы с Telegram Stars.

## Навигация

### API Эндпоинты

- [Payment Creation Log](./api/payment-creation-log.md) - Логирование создания платежа
- [Telegram Stars Payment](./api/telegram-stars-payment.md) - Создание платежа через Telegram Stars
- [Telegram Stars Payment Success](./api/telegram-stars-payment-success.md) - Обработка успешного платежа звездами
- [Payment Log](./api/payment-log.md) - Логирование завершенного платежа (legacy)

### Примеры

- [Payment Creation Log Examples](./examples/payment-creation-log/) - Примеры запросов для логирования создания платежа
- [Telegram Stars Payment Examples](./examples/telegram-stars-payment/) - Примеры запросов для Telegram Stars

## Общая информация

### Базовый URL

По умолчанию: `http://localhost:3000`

В продакшене используйте ваш домен.

### Аутентификация

Все эндпоинты требуют аутентификации через Bearer Token:

```
Authorization: Bearer YOUR_API_SECRET_KEY
```

Где `YOUR_API_SECRET_KEY` - значение из переменной окружения `API_SECRET_KEY`.

### Формат запросов

Все запросы должны быть в формате JSON с заголовком:
```
Content-Type: application/json
```

### Формат ответов

Все ответы возвращаются в формате JSON:

**Успешный запрос:**
```json
{
  "success": true,
  "message": "Описание операции",
  "data": { ... }
}
```

**Ошибка:**
```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

### Коды статусов

- `200` - Успешный запрос
- `400` - Неверные данные запроса
- `401` - Ошибка аутентификации
- `500` - Внутренняя ошибка сервера
- `503` - Сервис недоступен (логирование отключено)

## Быстрый старт

### 1. Настройка переменных окружения

Убедитесь, что в `.env` файле настроены:

```env
API_SECRET_KEY=your_secret_key_here
PAYMENT_LOG_ENABLED=true
LOG_CHANNEL_ID=@your_log_channel
```

### 2. Пример использования

Самый простой способ - использовать примеры из папки `examples/`:

```bash
# Скопируйте пример и замените YOUR_API_SECRET_KEY на реальный ключ
cd docs/examples/payment-creation-log
chmod +x curl.sh
./curl.sh
```

### 3. Проверка работы API

Используйте health check эндпоинт:

```bash
curl http://localhost:3000/bot-api/health
```

## Структура документации

```
docs/
├── README.md (этот файл)
├── api/
│   ├── payment-creation-log.md
│   ├── telegram-stars-payment.md
│   ├── telegram-stars-payment-success.md
│   └── payment-log.md
└── examples/
    ├── payment-creation-log/
    │   ├── request.json
    │   ├── curl.sh
    │   ├── powershell.ps1
    │   └── node.js
    └── telegram-stars-payment/
        ├── request.json
        ├── curl.sh
        ├── powershell.ps1
        └── node.js
```

## Поддержка

При возникновении проблем:
1. Проверьте правильность API ключа
2. Убедитесь, что все обязательные поля заполнены
3. Проверьте формат данных (типы полей)
4. Посмотрите логи сервера для деталей ошибки
