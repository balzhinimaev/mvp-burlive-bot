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

## Эндпоинт для Telegram Stars

### POST /api/telegram-stars/payment

Создает платеж через Telegram Stars (звезды Telegram).

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
  "productName": "Премиум подписка на месяц",
  "description": "Доступ ко всем функциям приложения на 30 дней",
  "amount": 100,
  "currency": "XTR",
  "payload": "premium_monthly_123",
  "providerData": "{\"plan\":\"premium\",\"duration\":30}",
  "photoUrl": "https://example.com/product.jpg",
  "photoSize": 1024,
  "photoWidth": 512,
  "photoHeight": 512,
  "needName": false,
  "needPhoneNumber": false,
  "needEmail": false,
  "needShippingAddress": false,
  "sendPhoneNumberToProvider": false,
  "sendEmailToProvider": false,
  "isFlexible": false,
  "utm": {
    "utm_source": "telegram",
    "utm_campaign": "stars_payment"
  },
  "promoId": "STARS2024"
}
```

**Обязательные поля:**
- `userId` - ID пользователя в Telegram
- `productName` - Название товара/услуги
- `amount` - Количество звезд (положительное число)

**Опциональные поля:**
- `username` - Username пользователя в Telegram
- `firstName` - Имя пользователя
- `lastName` - Фамилия пользователя
- `description` - Описание товара
- `currency` - Валюта (по умолчанию "XTR")
- `payload` - Дополнительная информация для обработки платежа
- `providerData` - Данные для провайдера платежей
- `photoUrl` - URL изображения товара
- `photoSize` - Размер изображения в байтах
- `photoWidth` - Ширина изображения в пикселях
- `photoHeight` - Высота изображения в пикселях
- `needName` - Запрашивать имя покупателя
- `needPhoneNumber` - Запрашивать номер телефона
- `needEmail` - Запрашивать email
- `needShippingAddress` - Запрашивать адрес доставки
- `sendPhoneNumberToProvider` - Отправлять телефон провайдеру
- `sendEmailToProvider` - Отправлять email провайдеру
- `isFlexible` - Разрешить гибкую цену (чаевые)
- `utm` - UTM параметры
- `promoId` - ID промокода

**Успешный ответ (200):**
```json
{
  "success": true,
  "invoiceLink": "https://t.me/invoice/...",
  "data": {
    "paymentId": "stars_1705312800000_123456789",
    "invoiceLink": "https://t.me/invoice/...",
    "amount": 100,
    "currency": "XTR",
    "productName": "Премиум подписка на месяц"
  }
}
```

**Ошибки:**
- `400` - Неверные данные запроса
- `401` - Неверный API ключ
- `500` - Внутренняя ошибка сервера

**Пример использования с curl:**
```bash
curl -X POST http://localhost:3000/api/telegram-stars/payment \
  -H "Authorization: Bearer your_secret_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123456789,
    "productName": "Премиум подписка",
    "description": "Доступ ко всем функциям",
    "amount": 50,
    "currency": "XTR",
    "isFlexible": true
  }'
```

**Особенности Telegram Stars:**
- Валюта всегда должна быть "XTR"
- Сумма указывается в звездах (целое число)
- Поддерживается гибкая цена с возможностью добавления чаевых
- Можно настроить запрос дополнительной информации от пользователя
- Создается ссылка для оплаты, которую можно отправить пользователю

**Уведомления в канал:**
При создании инвойса в Telegram канал отправляется уведомление с информацией о:
- Пользователе (имя, username, ID)
- Товаре и сумме
- Ссылке на инвойс
- UTM параметрах и промокодах
- Времени создания

**Пример сообщения в канале:**
```
⭐ Создан инвойс Telegram Stars #telegram_stars #invoice_created

👤 Пользователь: Иван Петров (@username)
🆔 ID: 123456789
📦 Товар: Премиум подписка на месяц
📝 Описание: Доступ ко всем функциям приложения на 30 дней
💰 Сумма: 100 XTR
💡 Гибкая цена: включена
🆔 Payment ID: stars_1705312800000_123456789
🔗 Ссылка: Открыть инвойс
📊 UTM: source: telegram, campaign: stars_payment
🎫 Промо: STARS2024
⏰ Время: 15.01.2024 14:30 (МСК)
```