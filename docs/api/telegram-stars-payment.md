# Telegram Stars Payment API

## Описание

Эндпоинт для создания платежа через Telegram Stars (звезды Telegram). Создает инвойс и возвращает ссылку для оплаты.

**Endpoint:** `POST /bot-api/telegram-stars/payment`

## Аутентификация

Требуется Bearer Token в заголовке Authorization.

**Заголовки:**
```
Authorization: Bearer YOUR_API_SECRET_KEY
Content-Type: application/json
```

## Запрос

### Обязательные поля

- `userId` (number) - ID пользователя в Telegram
- `productName` (string) - Название товара/услуги
- `amount` (number) - Количество звезд (положительное число, минимум 1)

### Опциональные поля

- `username` (string) - Username пользователя в Telegram
- `firstName` (string) - Имя пользователя
- `lastName` (string) - Фамилия пользователя
- `description` (string) - Описание товара
- `currency` (string) - Валюта (по умолчанию "XTR", для Stars всегда "XTR")
- `payload` (string) - Дополнительная информация для обработки платежа
- `photoUrl` (string) - URL изображения товара
- `photoSize` (number) - Размер изображения в байтах
- `photoWidth` (number) - Ширина изображения в пикселях
- `photoHeight` (number) - Высота изображения в пикселях
- `utm` (object) - UTM параметры
  - `utm_source` (string)
  - `utm_medium` (string)
  - `utm_campaign` (string)
  - `utm_term` (string)
  - `utm_content` (string)
- `promoId` (string) - ID промокода

### Пример запроса

```json
{
  "userId": 1272270574,
  "username": "frntdev",
  "firstName": "S",
  "productName": "Премиум подписка на месяц",
  "description": "Доступ ко всем функциям приложения на 30 дней",
  "amount": 100,
  "currency": "XTR"
}
```

## Ответ

### Успешный ответ (200)

```json
{
  "success": true,
  "invoiceLink": "https://t.me/invoice/...",
  "data": {
    "paymentId": "stars_1705312800000_1272270574",
    "invoiceLink": "https://t.me/invoice/...",
    "amount": 100,
    "currency": "XTR",
    "productName": "Премиум подписка на месяц"
  }
}
```

### Ошибки

**400 Bad Request** - Неверные данные запроса
```json
{
  "success": false,
  "error": "Missing required fields: userId, productName, amount"
}
```

```json
{
  "success": false,
  "error": "Currency must be XTR for Telegram Stars"
}
```

```json
{
  "success": false,
  "error": "Amount must be a positive number"
}
```

**401 Unauthorized** - Неверный API ключ
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**500 Internal Server Error** - Ошибка создания инвойса
```json
{
  "success": false,
  "error": "Failed to create payment invoice",
  "details": "Error message from Telegram API"
}
```

## Особенности Telegram Stars

- Валюта всегда должна быть "XTR" (Telegram Stars)
- Сумма указывается в звездах (целое число, минимум 1)
- При создании инвойса автоматически генерируется уникальный `paymentId` в формате `stars_{timestamp}_{userId}`
- Инвойс создается через Telegram Bot API метод `createInvoiceLink`
- Создается ссылка для оплаты, которую можно отправить пользователю
- При создании инвойса автоматически отправляется уведомление в Telegram канал (если включено логирование)

## Логирование

При успешном создании инвойса в Telegram канал отправляется уведомление с информацией:
- Пользователь (имя, username, ID)
- Товар и сумма
- Ссылка на инвойс
- UTM параметры и промокоды
- Время создания

## Примеры использования

См. примеры в папке [`../examples/telegram-stars-payment/`](../examples/telegram-stars-payment/):
- `request.json` - Тело запроса
- `curl.sh` - Пример с curl (Bash/Linux/Mac)
- `powershell.ps1` - Пример для PowerShell (Windows)
- `node.js` - Пример для Node.js
