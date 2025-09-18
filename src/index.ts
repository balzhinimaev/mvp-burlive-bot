import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './config';
import { ApiService } from './api';
import { parsePayload, createStartAppParam, createMiniAppLink, hasValidUtm, logger } from './utils';
import { LeadData, UserStartLog, PaymentLog, PaymentLogRequest, PaymentCreationLog, PaymentCreationLogRequest, TelegramStarsPaymentRequest, TelegramStarsPaymentResponse, TelegramStarsInvoiceLog } from './types';
import { ChannelLogger } from './channel-logger';
import { authenticateApiKey, requirePaymentLogging } from './auth-middleware';

// Используем any для упрощения типизации в данном примере
type BotContext = any;

const bot = new Telegraf<BotContext>(config.BOT_TOKEN);

// Инициализация канального логгера
const channelLogger = new ChannelLogger(bot);

// Инициализация Express сервера
const app = express();
app.use(express.json({ limit: '2mb' })); // безопаснее для больших апдейтов

// Защищенный эндпоинт для логирования платежей
app.post('/api/payment-log', authenticateApiKey, requirePaymentLogging, async (req, res) => {
  try {
    const paymentData: PaymentLogRequest = req.body;
    
    // Валидация обязательных полей
    if (!paymentData.userId || !paymentData.paymentId || !paymentData.amount || !paymentData.currency || !paymentData.registrationTime || !paymentData.paymentTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, paymentId, amount, currency, registrationTime, paymentTime'
      });
    }

    // Парсинг дат
    const registrationTime = new Date(paymentData.registrationTime);
    const paymentTime = new Date(paymentData.paymentTime);
    
    // Валидация дат
    if (isNaN(registrationTime.getTime()) || isNaN(paymentTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO 8601 format'
      });
    }

    // Вычисление времени до платежа
    const timeToPayment = paymentTime.getTime() - registrationTime.getTime();
    
    if (timeToPayment < 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment time cannot be before registration time'
      });
    }

    // Создание объекта для логирования
    const paymentLog: PaymentLog = {
      userId: paymentData.userId,
      username: paymentData.username,
      firstName: paymentData.firstName,
      lastName: paymentData.lastName,
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      registrationTime,
      paymentTime,
      timeToPayment,
      utm: paymentData.utm,
      promoId: paymentData.promoId,
    };

    // Асинхронно отправляем лог в канал
    channelLogger.logPayment(paymentLog).catch((error: any) => {
      logger.error('Failed to log payment to channel', { 
        userId: paymentData.userId, 
        paymentId: paymentData.paymentId,
        error: error.message 
      });
    });

    logger.info('Payment log request processed', {
      userId: paymentData.userId,
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      timeToPayment: timeToPayment,
    });

    return res.json({
      success: true,
      message: 'Payment logged successfully',
      data: {
        userId: paymentData.userId,
        paymentId: paymentData.paymentId,
        timeToPayment: timeToPayment,
      }
    });

  } catch (error: any) {
    logger.error('Error processing payment log request', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Эндпоинт для создания платежа через Telegram Stars
// Эндпоинт для создания платежа через Telegram Stars
app.post('/api/telegram-stars/payment', authenticateApiKey, async (req, res) => {
  try {
    // Логируем входящий запрос для отладки
    logger.info('Received Telegram Stars payment request', {
      body: req.body,
      headers: req.headers
    });

    const paymentData: TelegramStarsPaymentRequest = req.body;
    
    // Валидация обязательных полей
    if (!paymentData || !paymentData.userId || !paymentData.productName || !paymentData.amount) {
      logger.warn('Missing required fields in Telegram Stars payment request', {
        hasPaymentData: !!paymentData,
        userId: paymentData?.userId,
        productName: paymentData?.productName,
        amount: paymentData?.amount
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, productName, amount'
      });
    }

    // Валидация валюты (должна быть XTR для Telegram Stars)
    if (paymentData.currency && paymentData.currency !== 'XTR') {
      return res.status(400).json({
        success: false,
        error: 'Currency must be XTR for Telegram Stars'
      });
    }

    // Валидация количества звезд (должно быть положительным числом)
    if (paymentData.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    // Генерируем уникальный ID платежа
    const paymentId = `stars_${Date.now()}_${paymentData.userId}`;
    
    // Подготавливаем данные для создания инвойса
    // ВАЖНО: для Telegram Stars НЕ используем baseAmount * 100!
    const invoiceData: any = {
      title: paymentData.productName,
      description: paymentData.description || `Покупка: ${paymentData.productName}`,
      payload: paymentData.payload || paymentId,
      provider_token: '', // Для Telegram Stars не нужен
      currency: 'XTR',
      prices: [{
        label: paymentData.productName,
        amount: paymentData.amount // Прямое значение без умножения на 100
      }],
      // Убираем все поля, которые не поддерживаются для Stars
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      send_phone_number_to_provider: false,
      send_email_to_provider: false,
      is_flexible: false // Stars не поддерживают гибкие цены
    };

    // Добавляем только поддерживаемые опциональные поля
    if (paymentData.photoUrl) {
      invoiceData.photo_url = paymentData.photoUrl;
    }
    if (paymentData.photoSize) {
      invoiceData.photo_size = paymentData.photoSize;
    }
    if (paymentData.photoWidth) {
      invoiceData.photo_width = paymentData.photoWidth;
    }
    if (paymentData.photoHeight) {
      invoiceData.photo_height = paymentData.photoHeight;
    }

    // НЕ добавляем поля для гибких цен и чаевых - Stars их не поддерживают
    // НЕ добавляем provider_data - не нужен для Stars

    // Создаем инвойс через Telegram Bot API
    let invoiceLink: string;
    try {
      // Логируем данные инвойса для отладки
      logger.info('Creating Telegram Stars invoice', {
        userId: paymentData.userId,
        productName: paymentData.productName,
        amount: paymentData.amount,
        invoiceData: invoiceData
      });

      // Используем прямой HTTP запрос к Telegram Bot API
      const telegramApiUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}/createInvoiceLink`;
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });
      
      const result = await response.json() as { ok: boolean; result?: string; description?: string };
      
      if (!result.ok) {
        // Логируем детали ошибки
        logger.error('Telegram API error details', {
          error: result.description,
          invoiceData: invoiceData
        });
        throw new Error(result.description || 'Failed to create invoice');
      }
      
      if (!result.result) {
        throw new Error('No invoice link received from Telegram API');
      }
      
      invoiceLink = result.result;
    } catch (error: any) {
      logger.error('Failed to create Telegram Stars invoice', {
        userId: paymentData.userId,
        productName: paymentData.productName,
        amount: paymentData.amount,
        error: error.message
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment invoice',
        details: error.message
      });
    }

    // Логируем создание платежа
    logger.info('Telegram Stars payment created', {
      userId: paymentData.userId,
      paymentId,
      productName: paymentData.productName,
      amount: paymentData.amount,
      invoiceLink
    });

    // Логируем создание инвойса в канал
    const invoiceLog: TelegramStarsInvoiceLog = {
      userId: paymentData.userId,
      username: paymentData.username,
      firstName: paymentData.firstName,
      lastName: paymentData.lastName,
      paymentId,
      productName: paymentData.productName,
      description: paymentData.description,
      amount: paymentData.amount,
      currency: 'XTR',
      invoiceLink,
      isFlexible: false, // Всегда false для Stars
      timestamp: new Date(),
      utm: paymentData.utm,
      promoId: paymentData.promoId,
    };
    
    // Асинхронно отправляем лог в канал
    channelLogger.logTelegramStarsInvoice(invoiceLog).catch((error: any) => {
      logger.error('Failed to log Telegram Stars invoice to channel', { 
        userId: paymentData.userId, 
        paymentId,
        error: error.message 
      });
    });

    // Отправляем ответ
    const response: TelegramStarsPaymentResponse = {
      success: true,
      invoiceLink,
      data: {
        paymentId,
        invoiceLink,
        amount: paymentData.amount,
        currency: 'XTR',
        productName: paymentData.productName
      }
    };

    return res.json(response);

  } catch (error: any) {
    logger.error('Error processing Telegram Stars payment request', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bot is running',
    timestamp: new Date().toISOString(),
    paymentLoggingEnabled: config.PAYMENT_LOG_ENABLED,
  });
});

// Эндпоинт для логирования создания платежа (когда пользователь нажал на тариф)
app.post('/api/payment-creation-log', authenticateApiKey, requirePaymentLogging, async (req, res) => {
  try {
    const paymentCreationData: PaymentCreationLogRequest = req.body;
    
    // Валидация обязательных полей
    if (!paymentCreationData.userId || !paymentCreationData.paymentId || !paymentCreationData.amount || !paymentCreationData.currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, paymentId, amount, currency'
      });
    }

    // Создание объекта для логирования
    const paymentCreationLog: PaymentCreationLog = {
      userId: paymentCreationData.userId,
      username: paymentCreationData.username,
      firstName: paymentCreationData.firstName,
      lastName: paymentCreationData.lastName,
      paymentId: paymentCreationData.paymentId,
      amount: paymentCreationData.amount,
      currency: paymentCreationData.currency,
      tariffName: paymentCreationData.tariffName,
      timestamp: new Date(),
      utm: paymentCreationData.utm,
      promoId: paymentCreationData.promoId,
    };
    
    // Асинхронно отправляем лог в канал
    channelLogger.logPaymentCreation(paymentCreationLog).catch((error: any) => {
      logger.error('Failed to log payment creation to channel', { 
        userId: paymentCreationData.userId, 
        paymentId: paymentCreationData.paymentId,
        error: error.message 
      });
    });

    logger.info('Payment creation log request processed', {
      userId: paymentCreationData.userId,
      paymentId: paymentCreationData.paymentId,
      amount: paymentCreationData.amount,
      tariffName: paymentCreationData.tariffName,
    });

    return res.json({
      success: true,
      message: 'Payment creation logged successfully',
      data: {
        userId: paymentCreationData.userId,
        paymentId: paymentCreationData.paymentId,
        amount: paymentCreationData.amount,
        tariffName: paymentCreationData.tariffName,
      }
    });

  } catch (error: any) {
    logger.error('Error processing payment creation log request', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Middleware для логирования
bot.use((ctx: BotContext, next: () => Promise<void>) => {
  const user = ctx.from;
  const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : 'non-text';
  
  logger.info('Received message', {
    userId: user?.id,
    username: user?.username,
    firstName: user?.first_name,
    messageText,
  });
  
  return next();
});

// Обработка pre_checkout_query (обязательно для подтверждения оплаты)
bot.on('pre_checkout_query', async (ctx: BotContext) => {
  try {
    const preCheckoutQuery = ctx.preCheckoutQuery;
    const { id, from, currency, total_amount, invoice_payload } = preCheckoutQuery;
    
    logger.info('Received pre-checkout query', {
      queryId: id,
      userId: from.id,
      username: from.username,
      currency,
      totalAmount: total_amount,
      invoicePayload: invoice_payload
    });
    
    // Здесь можно добавить дополнительные проверки:
    // - Проверить валидность payload
    // - Проверить доступность товара
    // - Проверить лимиты пользователя и т.д.
    
    // Валидация валюты
    if (currency !== 'XTR') {
      logger.warn('Invalid currency in pre-checkout', {
        queryId: id,
        userId: from.id,
        currency
      });
      
      await ctx.answerPreCheckoutQuery(false, 'Неподдерживаемая валюта');
      return;
    }
    
    // Валидация суммы (минимум 1 звезда)
    if (total_amount < 1) {
      logger.warn('Invalid amount in pre-checkout', {
        queryId: id,
        userId: from.id,
        totalAmount: total_amount
      });
      
      await ctx.answerPreCheckoutQuery(false, 'Неверная сумма платежа');
      return;
    }
    
    // Подтверждаем платеж
    await ctx.answerPreCheckoutQuery(true);
    
    logger.info('Pre-checkout query approved', {
      queryId: id,
      userId: from.id,
      totalAmount: total_amount
    });
    
  } catch (error: any) {
    logger.error('Error processing pre-checkout query', {
      error: error.message,
      stack: error.stack,
      queryId: ctx.preCheckoutQuery?.id,
      userId: ctx.from?.id
    });
    
    // Отклоняем платеж в случае ошибки
    try {
      await ctx.answerPreCheckoutQuery(false, 'Произошла техническая ошибка. Попробуйте позже.');
    } catch (answerError: any) {
      logger.error('Failed to answer pre-checkout query with error', {
        error: answerError.message,
        queryId: ctx.preCheckoutQuery?.id
      });
    }
  }
});

// Обработка успешного платежа
bot.on('successful_payment', async (ctx: BotContext) => {
  try {
    const payment = ctx.message.successful_payment;
    const userId = ctx.from.id;
    
    logger.info('Received successful payment', {
      userId,
      username: ctx.from.username,
      currency: payment.currency,
      totalAmount: payment.total_amount,
      invoicePayload: payment.invoice_payload,
      telegramPaymentChargeId: payment.telegram_payment_charge_id,
      providerPaymentChargeId: payment.provider_payment_charge_id
    });
    
    // Парсим payload для получения информации о товаре
    let productInfo = null;
    try {
      // Если payload содержит JSON
      if (payment.invoice_payload.startsWith('{')) {
        productInfo = JSON.parse(payment.invoice_payload);
      }
    } catch (parseError) {
      logger.warn('Could not parse invoice payload as JSON', {
        userId,
        payload: payment.invoice_payload
      });
    }
    
    // Создаем объект для логирования платежа
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
    channelLogger.logPayment(paymentLog).catch((error: any) => {
      logger.error('Failed to log successful payment to channel', { 
        userId,
        paymentId: payment.telegram_payment_charge_id,
        error: error.message 
      });
    });
    
    // Здесь добавьте свою бизнес-логику:
    // - Активировать подписку пользователя
    // - Добавить премиум-функции
    // - Обновить базу данных
    // - Отправить уведомление в другие системы
    
    // Например, если у вас есть API для активации подписки:
    /*
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
      
      // Можно отправить уведомление администратору
      // или добавить в очередь для повторной обработки
    }
    */
    
    // Отправляем подтверждение пользователю
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
    
    logger.info('Successfully processed payment', {
      userId,
      paymentId: payment.telegram_payment_charge_id,
      amount: payment.total_amount
    });
    
  } catch (error: any) {
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
});

// Команда для поддержки по платежам (обязательна согласно требованиям Telegram)
bot.on('text', async (ctx: BotContext) => {
  if (ctx.message && 'text' in ctx.message && ctx.message.text === '/paysupport') {
    const userId = ctx.from.id;
    
    logger.info('Processing /paysupport command', { userId });
    
    const supportMessage = 
      `🛠 <b>Поддержка по платежам</b>\n\n` +
      `По всем вопросам, связанным с платежами и возвратами, ` +
      `обращайтесь к администратору: @frntdtev\n\n` +
      `При обращении укажите:\n` +
      `• ID платежа\n` +
      `• Описание проблемы\n` +
      `• Дату и время платежа`;

    await ctx.reply(supportMessage, {
      parse_mode: 'HTML'
    });
  }
});

// Обработчик команды /start
bot.start(async (ctx: BotContext) => {
  const startTime = Date.now();
  const userId = ctx.from.id;
  const payload = ctx.startPayload || '';
  
  logger.info('Processing /start command', {
    userId,
    payload,
  });

  try {
    // Парсим payload
    const parsedData = parsePayload(payload);
    const { utm, promoId } = parsedData;
    
    // Отправляем лид в фоне (не блокируем UX)
    const leadData: LeadData = {
      userId,
      utm,
      promoId,
    };
    
    // Асинхронно отправляем лид, не ждем результата
    ApiService.sendLead(leadData).catch((error) => {
      logger.error('Failed to send lead', { userId, error: error.message });
    });

    // Логируем старт пользователя в канал
    const userStartLog: UserStartLog = {
      userId,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      languageCode: ctx.from.language_code,
      utm,
      promoId,
      timestamp: new Date(),
    };
    
    // Асинхронно отправляем лог в канал, не ждем результата
    channelLogger.logUserStart(userStartLog).catch((error: any) => {
      logger.error('Failed to log user start to channel', { userId, error: error.message });
    });

    // Создаем кнопку для Mini App
    let keyboard;
    
    if (config.MINI_APP_STARTAPP_ENABLED && hasValidUtm(utm)) {
      // Используем startapp deep link (предпочтительный вариант)
      const startAppParam = createStartAppParam(utm, promoId);
      const miniAppUrl = createMiniAppLink(config.BOT_USERNAME, startAppParam);
      
      keyboard = {
        inline_keyboard: [[
          {
            text: '🚀 Открыть приложение',
            url: miniAppUrl,
          }
        ]]
      };
      
      logger.info('Created startapp link', {
        userId,
        startAppParam,
        url: miniAppUrl,
      });
      
    } else {
      // Fallback: обычная WebApp кнопка
      keyboard = {
        inline_keyboard: [[
          {
            text: '🚀 Открыть приложение',
            web_app: {
              url: config.MINI_APP_URL,
            }
          }
        ]]
      };
      
      logger.info('Created webapp button', {
        userId,
        url: config.MINI_APP_URL,
      });
    }

    // Отправляем приветственное сообщение
    const welcomeMessage = 
      `Добро пожаловать в бот для изучения <b>английского языка</b>!\n\n` +
      `Изучайте Анлийский с помощью мини-уроков, озвучки и транслитерации. ` +
      `20 фраз за 7 дней — первый урок бесплатно!\n\n Нажмите кнопку ниже, чтобы открыть приложение:`;

    // Log the exact keyboard payload before sending to help diagnose BUTTON_URL_INVALID
    logger.info('Sending welcome message with keyboard', {
      userId,
      keyboardPreview: JSON.stringify(keyboard).substring(0, 1000),
    });

    await ctx.reply(welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
    
    const processingTime = Date.now() - startTime;
    logger.info('Successfully processed /start', {
      userId,
      processingTime,
      hasUtm: hasValidUtm(utm),
    });

  } catch (error: any) {
    logger.error('Error processing /start', {
      userId,
      error: error.message,
      stack: error.stack,
    });
    
    // Отправляем базовое сообщение даже при ошибке
    // Log the fallback keyboard before sending
    const fallbackKeyboard = {
      inline_keyboard: [[
        {
          text: '🚀 Открыть приложение',
          web_app: { url: config.MINI_APP_URL }
        }
      ]]
    };

    logger.info('Sending fallback welcome message with keyboard', {
      userId,
      keyboardPreview: JSON.stringify(fallbackKeyboard).substring(0, 1000),
    });

    await ctx.reply(
      '🇲🇳 Добро пожаловать! Произошла техническая ошибка, но вы можете открыть приложение:',
      {
        reply_markup: fallbackKeyboard,
      }
    );
  }
});

// Обработчик команды /help
bot.help(async (ctx: BotContext) => {
  const userId = ctx.from.id;
  
  logger.info('Processing /help command', { userId });
  
  const helpMessage = 
    `ℹ️ <b>Помощь</b>\n\n` +
    `Этот бот поможет вам изучать бурятский язык через Mini App.\n\n` +
    `<b>Команды:</b>\n` +
    `• /start — начать изучение\n` +
    `• /help — показать эту справку\n\n` +
    `Нажмите кнопку ниже, чтобы открыть приложение:`;

  await ctx.reply(helpMessage, {
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
});

// Обработчик сообщений (включая invoice)
bot.on('message', async (ctx: BotContext) => {
  const userId = ctx.from.id;
  
  // Проверяем, есть ли в сообщении информация об инвойсе
  if ('invoice' in ctx.message) {
    logger.info('Received invoice message', {
      userId,
      invoice: ctx.message.invoice
    });
    
    // Здесь можно добавить дополнительную обработку инвойса
    // Например, логирование или уведомления
  }
  
  // Проверяем, является ли это текстовым сообщением
  if ('text' in ctx.message) {
    const messageText = ctx.message.text;
    
    logger.info('Unknown text message received', { userId, messageText });
    
    await ctx.reply(
      'Используйте /start для начала работы или /help для получения справки.',
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🚀 Открыть приложение',
              web_app: { url: config.MINI_APP_URL }
            }
          ]]
        }
      }
    );
  } else {
    // Для не-текстовых сообщений
    logger.info('Unknown non-text message received', { 
      userId, 
      messageType: Object.keys(ctx.message).join(', ')
    });
  }
});

// Обработка ошибок
bot.catch((err: any, ctx: BotContext) => {
  logger.error('Bot error', {
    userId: ctx.from?.id,
    error: err.message,
    stack: err.stack,
  });
});

// Функция для создания возврата (опционально)
export async function refundPayment(paymentChargeId: string, reason?: string): Promise<boolean> {
  try {
    const telegramApiUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}/refundStarPayment`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_payment_charge_id: paymentChargeId
      })
    });
    
    const result = await response.json() as { ok: boolean; description?: string };
    
    if (!result.ok) {
      logger.error('Failed to refund payment', {
        paymentChargeId,
        error: result.description
      });
      return false;
    }
    
    logger.info('Payment refunded successfully', {
      paymentChargeId,
      reason
    });
    
    return true;
  } catch (error: any) {
    logger.error('Error refunding payment', {
      paymentChargeId,
      error: error.message
    });
    return false;
  }
}

// Функция для запуска бота
async function startBot() {
  try {
    // Проверяем подключение к API
    const apiHealthy = await ApiService.healthCheck();
    if (!apiHealthy) {
      logger.warn('API health check failed, continuing anyway');
    } else {
      logger.info('API health check passed');
    }

    // Проверяем подключение к каналу логов
    if (channelLogger.isLoggerEnabled()) {
      const channelHealthy = await channelLogger.testChannel();
      if (!channelHealthy) {
        logger.warn('Channel test failed, channel logging may not work');
      } else {
        logger.info('Channel test passed, logging enabled');
      }
    } else {
      logger.info('Channel logging disabled');
    }

    if (process.env.NODE_ENV === 'production') {
      // В продакшене используем webhook
      const webhookUrl = process.env.WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('WEBHOOK_URL is required in production');
      }

      // Нормализуем URL и path
      const path = config.WEBHOOK_PATH.startsWith('/')
        ? config.WEBHOOK_PATH
        : `/${config.WEBHOOK_PATH}`;
      const fullWebhookUrl = `${webhookUrl.replace(/\/+$/, '')}${path}`;

      // (опционально) секрет для Bot API
      const secretToken = process.env.TELEGRAM_SECRET_TOKEN;

      // Подключаем middleware Telegraf для вебхука
      app.use((bot as any).webhookCallback(path));

      // (опционально) своя проверка секретного заголовка
      if (secretToken) {
        app.use(path, (req, res, next) => {
          if (req.get('x-telegram-bot-api-secret-token') !== secretToken) {
            return res.sendStatus(401);
          }
          return next();
        });
      }

      // Стартуем сервер, а уже потом выставляем webhook
      app.listen(config.PORT, async () => {
        logger.info('Express server started', { port: config.PORT });
        try {
          await bot.telegram.setWebhook(fullWebhookUrl);
          logger.info('Webhook set', { url: fullWebhookUrl });
        } catch (err: any) {
          logger.error('Failed to set webhook', { error: err.message });
          process.exit(1);
        }
      });

      logger.info('Bot started with webhook', { port: config.PORT });

    } else {
      // В разработке используем long polling
      await bot.telegram.deleteWebhook().catch(() => {});
      logger.info('Webhook removed for development');

      app.listen(config.PORT, () => {
        logger.info('Express server started', { port: config.PORT });
      });

      await bot.launch();
      logger.info('Bot started with long polling');
    }

    logger.info('Bot successfully started', {
      username: config.BOT_USERNAME,
      apiUrl: config.API_BASE_URL,
      miniAppUrl: config.MINI_APP_URL,
    });

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error: any) {
    logger.error('Failed to start bot', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Запускаем бота
startBot();
