import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './config';
import { ApiService } from './api';
import { parsePayload, createStartAppParam, createMiniAppLink, hasValidUtm, logger } from './utils';
import { LeadData, UserStartLog, PaymentLog, PaymentLogRequest, PaymentCreationLog, PaymentCreationLogRequest } from './types';
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
      `20 фраз за 7 дней — первый урок бесплатно!`;

    // Log the exact keyboard payload before sending to help diagnose BUTTON_URL_INVALID
    logger.info('Sending welcome message with keyboard', {
      userId,
      keyboardPreview: JSON.stringify(keyboard).substring(0, 1000),
    });

    await ctx.reply(welcomeMessage, {
      reply_markup: keyboard,
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

// Обработчик неизвестных команд
bot.on('message', async (ctx: BotContext) => {
  
  const userId = ctx.from.id;
  const messageText = 'text' in ctx.message ? ctx.message.text : 'non-text';
  
  logger.info('Unknown message received', { userId, messageText });
  
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
});

// Обработка ошибок
bot.catch((err: any, ctx: BotContext) => {
  logger.error('Bot error', {
    userId: ctx.from?.id,
    error: err.message,
    stack: err.stack,
  });
});

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
