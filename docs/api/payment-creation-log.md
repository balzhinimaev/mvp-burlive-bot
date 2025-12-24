# Payment Creation Log API

## Описание

Эндпоинт для логирования момента, когда пользователь нажал на тариф и создался платеж (до фактической оплаты).

**Endpoint:** `POST /bot-api/payment-creation-log`

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
- `paymentId` (string) - Уникальный ID платежа
- `amount` (number) - Сумма платежа
- `currency` (string) - Валюта (например: RUB, USD, EUR, XTR)

### Опциональные поля

- `username` (string) - Username пользователя
- `firstName` (string) - Имя пользователя
- `lastName` (string) - Фамилия пользователя
- `tariffName` (string) - Название тарифа
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
  "paymentId": "payment_20240115_1272270574_001",
  "amount": 1000,
  "currency": "RUB",
  "tariffName": "Премиум подписка"
}
```

## Ответ

### Успешный ответ (200)

```json
{
  "success": true,
  "message": "Payment creation logged successfully",
  "data": {
    "userId": 1272270574,
    "paymentId": "payment_20240115_1272270574_001",
    "amount": 1000,
    "tariffName": "Премиум подписка"
  }
}
```

### Ошибки

**400 Bad Request** - Неверные данные запроса
```json
{
  "success": false,
  "error": "Missing required fields: userId, paymentId, amount, currency"
}
```

**401 Unauthorized** - Неверный API ключ
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**503 Service Unavailable** - Логирование платежей отключено
```json
{
  "success": false,
  "error": "Payment logging is disabled"
}
```

**500 Internal Server Error** - Внутренняя ошибка сервера
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Логирование

При успешном запросе в Telegram канал отправляется уведомление с информацией:
- Пользователь (имя, username, ID)
- Платеж (ID, сумма, валюта)
- Тариф
- UTM параметры и промокоды
- Время создания

## Примеры использования

См. примеры в папке [`../examples/payment-creation-log/`](../examples/payment-creation-log/):
- `request.json` - Тело запроса
- `curl.sh` - Пример с curl (Bash/Linux/Mac)
- `powershell.ps1` - Пример для PowerShell (Windows)
- `node.js` - Пример для Node.js
