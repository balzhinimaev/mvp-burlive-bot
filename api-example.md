# API для логирования платежей

## Описание

Защищенный эндпоинт для отправки данных о платежах в Telegram канал для логирования.

## Эндпоинты

### POST /api/payment-log

Отправляет информацию о платеже в Telegram канал.

**Аутентификация:** Bearer Token (API_SECRET_KEY)

**Заголовки:**
```
Authorization: Bearer YOUR_API_SECRET_KEY
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "userId": 123456789,
  "username": "username",
  "firstName": "Имя",
  "lastName": "Фамилия",
  "paymentId": "payment_123456",
  "amount": 1000,
  "currency": "rub",
  "registrationTime": "2024-01-15T10:30:00.000Z",
  "paymentTime": "2024-01-15T11:45:00.000Z",
  "utm": {
    "utm_source": "google",
    "utm_campaign": "winter_sale",
    "utm_medium": "cpc"
  },
  "promoId": "WINTER2024"
}
```

**Обязательные поля:**
- `userId` - ID пользователя в Telegram
- `paymentId` - Уникальный ID платежа
- `amount` - Сумма платежа
- `currency` - Валюта (rub, usd, eur)
- `registrationTime` - Время регистрации (ISO 8601)
- `paymentTime` - Время платежа (ISO 8601)

**Опциональные поля:**
- `username` - Username пользователя
- `firstName` - Имя пользователя
- `lastName` - Фамилия пользователя
- `utm` - UTM параметры
- `promoId` - ID промокода

**Успешный ответ (200):**
```json
{
  "success": true,
  "message": "Payment logged successfully",
  "data": {
    "userId": 123456789,
    "paymentId": "payment_123456",
    "timeToPayment": 4500000
  }
}
```

**Ошибки:**
- `400` - Неверные данные запроса
- `401` - Неверный API ключ
- `503` - Логирование платежей отключено
- `500` - Внутренняя ошибка сервера

### GET /api/health

Проверка состояния сервиса.

**Ответ:**
```json
{
  "success": true,
  "message": "Bot is running",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "paymentLoggingEnabled": true
}
```

## Настройка

Добавьте в `.env` файл:

```env
# API ключ для аутентификации (обязательно)
API_SECRET_KEY=your_secret_key_here

# Включить/выключить логирование платежей (по умолчанию: true)
PAYMENT_LOG_ENABLED=true

# ID канала для логов (уже настроен)
LOG_CHANNEL_ID=@your_log_channel
```

## Пример использования с curl

```bash
curl -X POST http://localhost:3000/api/payment-log \
  -H "Authorization: Bearer your_secret_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123456789,
    "username": "testuser",
    "firstName": "Тест",
    "lastName": "Пользователь",
    "paymentId": "payment_123456",
    "amount": 1000,
    "currency": "rub",
    "registrationTime": "2024-01-15T10:30:00.000Z",
    "paymentTime": "2024-01-15T11:45:00.000Z",
    "utm": {
      "utm_source": "google",
      "utm_campaign": "winter_sale"
    }
  }'
```

## Формат сообщения в канале

Сообщение в Telegram канале будет выглядеть так:

```
💰 Новый платеж

👤 Пользователь: Тест Пользователь (@testuser)
🆔 ID: 123456789
💳 Платеж: 1000 RUB
🆔 Payment ID: payment_123456
⏱️ Время до платежа: 1ч 15м
📊 UTM: source: google, campaign: winter_sale

📅 Регистрация: 15.01.2024 13:30 (МСК)
💳 Платеж: 15.01.2024 14:45 (МСК)
```

## Новый эндпоинт: Логирование создания платежа

### POST /api/payment-creation-log

Логирует момент, когда пользователь нажал на тариф и создался платеж (до фактической оплаты).

**Аутентификация:** Bearer Token (API_SECRET_KEY)

**Заголовки:**
```
Authorization: Bearer YOUR_API_SECRET_KEY
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "userId": 123456789,
  "username": "username",
  "firstName": "Имя",
  "lastName": "Фамилия",
  "paymentId": "payment_123456",
  "amount": 1000,
  "currency": "RUB",
  "tariffName": "Премиум на месяц",
  "utm": {
    "utm_source": "telegram",
    "utm_medium": "bot",
    "utm_campaign": "winter_sale"
  },
  "promoId": "PROMO123"
}
```

**Ответ (успех):**
```json
{
  "success": true,
  "message": "Payment creation logged successfully",
  "data": {
    "userId": 123456789,
    "paymentId": "payment_123456",
    "amount": 1000,
    "tariffName": "Премиум на месяц"
  }
}
```

**Ответ (ошибка):**
```json
{
  "success": false,
  "error": "Missing required fields: userId, paymentId, amount, currency"
}
```

**Пример сообщения в канале:**
```
🛒 Создание платежа #payment_creation #new_payment

👤 Пользователь: Иван Петров (@username)
🆔 ID: 123456789
💳 Платеж: payment_123456
💰 Сумма: 1000 RUB
📦 Тариф: Премиум на месяц
📊 UTM: source: telegram, campaign: winter_sale
🎫 Промо: PROMO123
⏰ Время: 15.01.2024 14:30 (МСК)
```