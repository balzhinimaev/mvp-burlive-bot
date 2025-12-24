# Payment Log API

## Описание

Эндпоинт для логирования завершенного платежа (после фактической оплаты). Используется для отслеживания успешных транзакций.

**Endpoint:** `POST /bot-api/payment-log`

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
- `registrationTime` (string) - Время регистрации в формате ISO 8601
- `paymentTime` (string) - Время платежа в формате ISO 8601

### Опциональные поля

- `username` (string) - Username пользователя
- `firstName` (string) - Имя пользователя
- `lastName` (string) - Фамилия пользователя
- `product` (string) - Код продукта (например: "monthly", "yearly")
- `tariffName` (string) - Название тарифа для отображения пользователю (например: "Премиум на месяц")
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
  "userId": 123456789,
  "username": "username",
  "firstName": "Имя",
  "lastName": "Фамилия",
  "paymentId": "pay_1234567890",
  "amount": 299.00,
  "currency": "RUB",
  "registrationTime": "2024-01-15T09:00:00.000Z",
  "paymentTime": "2024-01-15T10:30:00.000Z",
  "product": "monthly",
  "tariffName": "Премиум на месяц",
  "utm": {
    "utm_source": "google",
    "utm_campaign": "winter_sale",
    "utm_medium": "cpc"
  },
  "promoId": "WINTER2024"
}
```

## Ответ

### Успешный ответ (200)

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

Где `timeToPayment` - время от регистрации до платежа в миллисекундах.

### Ошибки

**400 Bad Request** - Неверные данные запроса
```json
{
  "success": false,
  "error": "Missing required fields: userId, paymentId, amount, currency, registrationTime, paymentTime"
}
```

```json
{
  "success": false,
  "error": "Invalid date format. Use ISO 8601 format"
}
```

```json
{
  "success": false,
  "error": "Payment time cannot be before registration time"
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
- Время регистрации и платежа
- Время до платежа
- UTM параметры и промокоды

## Примечания

- Время должно быть в формате ISO 8601 (например: `2024-01-15T10:30:00.000Z`)
- `paymentTime` должен быть позже или равен `registrationTime`
- Автоматически вычисляется `timeToPayment` как разница между временем платежа и регистрации
