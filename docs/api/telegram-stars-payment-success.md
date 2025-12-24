# Обработка успешного платежа Telegram Stars

## Описание

Этот документ описывает, как обрабатывается успешный платеж через Telegram Stars после того, как пользователь оплатил инвойс.

## Процесс обработки платежа

Обработка платежа проходит в два этапа:

### 1. Pre-checkout Query (Подтверждение платежа)

Перед тем как пользователь завершит оплату, Telegram отправляет событие `pre_checkout_query`. Бот должен ответить на это событие, подтвердив или отклонив платеж.

**Обработчик:** `bot.on('pre_checkout_query')`

**Что происходит:**
1. Получение данных о платеже:
   - `id` - ID запроса
   - `from` - Информация о пользователе
   - `currency` - Валюта (должна быть "XTR" для Stars)
   - `total_amount` - Сумма платежа в звездах
   - `invoice_payload` - Полезная нагрузка (payload) из инвойса

2. Валидация:
   - Проверка валюты (должна быть "XTR")
   - Проверка суммы (минимум 1 звезда)

3. Подтверждение:
   - Если все проверки пройдены, вызывается `ctx.answerPreCheckoutQuery(true)`
   - Если есть ошибки, вызывается `ctx.answerPreCheckoutQuery(false, 'Сообщение об ошибке')`

**Код валидации:**
```typescript
// Валидация валюты
if (currency !== 'XTR') {
  await ctx.answerPreCheckoutQuery(false, 'Неподдерживаемая валюта');
  return;
}

// Валидация суммы (минимум 1 звезда)
if (total_amount < 1) {
  await ctx.answerPreCheckoutQuery(false, 'Неверная сумма платежа');
  return;
}

// Подтверждаем платеж
await ctx.answerPreCheckoutQuery(true);
```

### 2. Successful Payment (Успешный платеж)

После того как пользователь успешно оплатил инвойс, Telegram отправляет событие `successful_payment`.

**Обработчик:** `bot.on('successful_payment')`

**Что происходит:**

1. **Извлечение данных о платеже:**
   ```typescript
   const payment = ctx.message.successful_payment;
   const userId = ctx.from.id;
   
   // Данные платежа:
   - payment.currency (всегда "XTR" для Stars)
   - payment.total_amount (количество звезд)
   - payment.invoice_payload (payload из инвойса)
   - payment.telegram_payment_charge_id (ID платежа)
   - payment.provider_payment_charge_id (ID от провайдера)
   ```

2. **Парсинг payload:**
   ```typescript
   let productInfo = null;
   try {
     // Если payload содержит JSON
     if (payment.invoice_payload.startsWith('{')) {
       productInfo = JSON.parse(payment.invoice_payload);
     }
   } catch (parseError) {
     // Логируем предупреждение, но продолжаем обработку
   }
   ```

3. **Логирование платежа в канал:**
   ```typescript
   const paymentLog: PaymentLog = {
     userId,
     username: ctx.from.username,
     firstName: ctx.from.first_name,
     lastName: ctx.from.last_name,
     paymentId: payment.telegram_payment_charge_id,
     amount: payment.total_amount,
     currency: payment.currency,
     registrationTime: new Date(), // Можно улучшить, сохранив время регистрации
     paymentTime: new Date(),
     timeToPayment: 0, // Можно улучшить, вычислив время от создания инвойса
     utm: undefined, // Можно улучшить, сохранив UTM из payload
     promoId: undefined, // Можно улучшить, сохранив promo из payload
   };
   
   // Асинхронно логируем платеж в канал
   channelLogger.logPayment(paymentLog).catch((error) => {
     logger.error('Failed to log successful payment to channel', { 
       userId,
       paymentId: payment.telegram_payment_charge_id,
       error: error.message 
     });
   });
   ```

4. **Бизнес-логика (место для вашей реализации):**
   ```typescript
   // Здесь добавьте свою бизнес-логику:
   // - Активировать подписку пользователя
   // - Добавить премиум-функции
   // - Обновить базу данных
   // - Отправить уведомление в другие системы
   
   // Например:
   try {
     await ApiService.activateSubscription({
       userId,
       paymentId: payment.telegram_payment_charge_id,
       amount: payment.total_amount,
       productInfo
     });
   } catch (activationError) {
     logger.error('Failed to activate subscription', {
       userId,
       paymentId: payment.telegram_payment_charge_id,
       error: activationError.message
     });
   }
   ```

5. **Отправка подтверждения пользователю:**
   ```typescript
   const confirmationMessage = 
     `✅ <b>Платеж успешно выполнен!</b>\n\n` +
     `💰 Сумма: ${payment.total_amount} ⭐️\n` +
     `🆔 ID платежа: <code>${payment.telegram_payment_charge_id}</code>\n\n` +
     `Спасибо за покупку! Ваш доступ активирован.\n\n` +
     `🚀 Откройте приложение, чтобы воспользоваться новыми возможностями:`;
   
   await ctx.reply(confirmationMessage, {
     parse_mode: 'HTML',
     reply_markup: {
       inline_keyboard: [[
         {
           text: '🚀 Открыть приложение',
           web_app: { url: config.MINI_APP_URL }
         }
       ]]
     }
   });
   ```

## Обработка ошибок

Если при обработке платежа возникает ошибка:

1. Ошибка логируется в лог-файл
2. Пользователю отправляется сообщение об ошибке с ID платежа
3. Платеж уже получен, поэтому важно обработать его корректно

```typescript
catch (error: any) {
  logger.error('Error processing successful payment', {
    error: error.message,
    stack: error.stack,
    userId: ctx.from?.id,
    paymentId: ctx.message?.successful_payment?.telegram_payment_charge_id
  });
  
  // Отправляем сообщение об ошибке пользователю
  try {
    await ctx.reply(
      '⚠️ Платеж получен, но произошла ошибка при обработке.\n\n' +
      'Обратитесь в поддержку с ID платежа: ' +
      `<code>${ctx.message?.successful_payment?.telegram_payment_charge_id}</code>`,
      { parse_mode: 'HTML' }
    );
  } catch (replyError: any) {
    logger.error('Failed to send error message to user', {
      error: replyError.message,
      userId: ctx.from?.id
    });
  }
}
```

## Что можно улучшить

В текущей реализации есть несколько моментов, которые можно улучшить:

1. **Время регистрации:** Сейчас `registrationTime` устанавливается на текущее время. Лучше сохранять время создания инвойса из `invoice_payload`.

2. **Время до платежа:** Сейчас `timeToPayment` всегда 0. Можно вычислять как разницу между временем платежа и временем создания инвойса.

3. **UTM параметры и промокоды:** Сейчас они не извлекаются. Можно добавить их в `invoice_payload` при создании инвойса и извлекать здесь.

4. **Бизнес-логика:** Добавить реальную логику активации подписки/функций после успешного платежа.

## Пример сообщения в канале

После успешного платежа в Telegram канал отправляется уведомление:

```
💰 Новый платеж

👤 Пользователь: Иван Петров (@username)
🆔 ID: 1272270574
💳 Платеж: 100 ⭐️
🆔 Payment ID: 1234567890
⏱️ Время до платежа: 0м

📅 Регистрация: 15.01.2024 14:30 (МСК)
💳 Платеж: 15.01.2024 14:30 (МСК)
```

## Связанные документы

- [Telegram Stars Payment API](./telegram-stars-payment.md) - Создание инвойса
- [Payment Log API](./payment-log.md) - Ручное логирование платежей
