import { config } from './config';
import { UserStartLog, PaymentLog, PaymentCreationLog, TelegramStarsInvoiceLog, UTMParams } from './types';
import { logger } from './utils';

// Используем any для упрощения типизации телеграм бота
type TelegramBot = any;

export class ChannelLogger {
  private bot: TelegramBot;
  private channelId?: string;
  private isEnabled: boolean;
  private userStartCache = new Set<number>(); // Кеш для отслеживания первого запуска

  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.channelId = config.LOG_CHANNEL_ID;
    this.isEnabled = config.LOG_CHANNEL_ENABLED && !!this.channelId;
    
    logger.info('Channel logger initialized', {
      enabled: this.isEnabled,
      channelId: this.channelId ? `***${this.channelId.slice(-4)}` : 'none',
    });
  }

  /**
   * Логирование старта бота пользователем
   */
  async logUserStart(userStartData: UserStartLog): Promise<void> {
    if (!this.isEnabled || !this.channelId) {
      return;
    }

    try {
      // Проверяем, первый ли это запуск пользователя (простая проверка по кешу)
      const isFirstTime = !this.userStartCache.has(userStartData.userId);
      if (!isFirstTime) {
        userStartData.isFirstTime = false;
      } else {
        this.userStartCache.add(userStartData.userId);
        userStartData.isFirstTime = true;
      }

      const message = this.formatUserStartMessage(userStartData);
      
      await this.bot.telegram.sendMessage(this.channelId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      logger.info('User start logged to channel', {
        userId: userStartData.userId,
        channelId: this.channelId,
        isFirstTime: userStartData.isFirstTime,
      });

    } catch (error: any) {
      logger.error('Failed to log user start to channel', {
        userId: userStartData.userId,
        channelId: this.channelId,
        error: error.message,
      });
    }
  }

  /**
   * Форматирование сообщения о старте пользователя
   */
  private formatUserStartMessage(data: UserStartLog): string {
    const { userId, username, firstName, lastName, utm, promoId, timestamp, isFirstTime } = data;
    
    // Эмодзи для статуса
    const statusEmoji = isFirstTime ? '🆕' : '🔄';
    const statusText = isFirstTime ? 'Новый пользователь' : 'Повторный запуск';
    
    // Форматирование имени пользователя
    const userInfo = [];
    if (firstName) userInfo.push(firstName);
    if (lastName) userInfo.push(lastName);
    const displayName = userInfo.length > 0 ? userInfo.join(' ') : 'Без имени';
    const usernameText = username ? `@${username}` : 'без username';
    
    // Форматирование UTM параметров
    const utmParts = [];
    if (utm.utm_source) utmParts.push(`source: ${utm.utm_source}`);
    if (utm.utm_campaign) utmParts.push(`campaign: ${utm.utm_campaign}`);
    if (utm.utm_medium) utmParts.push(`medium: ${utm.utm_medium}`);
    if (utm.utm_term) utmParts.push(`term: ${utm.utm_term}`);
    if (utm.utm_content) utmParts.push(`content: ${utm.utm_content}`);
    
    const utmText = utmParts.length > 0 ? utmParts.join(', ') : 'без UTM';
    const promoText = promoId ? `\n🎫 <b>Промо:</b> ${promoId}` : '';
    
    // Форматирование времени
    const timeText = timestamp.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${statusEmoji} <b>${statusText}</b> #user_start #new_user

👤 <b>Пользователь:</b> ${displayName} (${usernameText})
🆔 <b>ID:</b> <code>${userId}</code>
📊 <b>UTM:</b> ${utmText}${promoText}
🕒 <b>Время:</b> ${timeText} (МСК)`;
  }

  /**
   * Проверка доступности канала (без отправки сообщения)
   */
  async testChannel(): Promise<boolean> {
    if (!this.channelId) {
      return false;
    }

    try {
      // Проверяем доступ к каналу через getChat вместо отправки сообщения
      // Это не спамит тестовыми сообщениями при каждом перезапуске
      await this.bot.telegram.getChat(this.channelId);
      return true;
    } catch (error: any) {
      logger.error('Channel test failed', {
        channelId: this.channelId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Включение/отключение логирования
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled && !!this.channelId;
    logger.info('Channel logging status changed', { enabled: this.isEnabled });
  }

  /**
   * Получение статуса логирования
   */
  isLoggerEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Логирование платежа пользователя
   */
  async logPayment(paymentData: PaymentLog): Promise<void> {
    if (!this.isEnabled || !this.channelId) {
      return;
    }

    try {
      const message = this.formatPaymentMessage(paymentData);
      
      await this.bot.telegram.sendMessage(this.channelId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      logger.info('Payment logged to channel', {
        userId: paymentData.userId,
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        channelId: this.channelId,
      });

    } catch (error: any) {
      logger.error('Failed to log payment to channel', {
        userId: paymentData.userId,
        paymentId: paymentData.paymentId,
        channelId: this.channelId,
        error: error.message,
      });
    }
  }

  /**
   * Форматирование сообщения о платеже
   */
  private formatPaymentMessage(data: PaymentLog): string {
    const { 
      userId, 
      username, 
      firstName, 
      lastName, 
      paymentId, 
      amount, 
      currency, 
      registrationTime, 
      paymentTime, 
      timeToPayment,
      utm,
      promoId 
    } = data;
    
    // Форматирование имени пользователя
    const userInfo = [];
    if (firstName) userInfo.push(firstName);
    if (lastName) userInfo.push(lastName);
    const displayName = userInfo.length > 0 ? userInfo.join(' ') : 'Без имени';
    const usernameText = username ? `@${username}` : 'без username';
    
    // Форматирование времени до платежа
    const timeToPaymentText = this.formatTimeToPayment(timeToPayment);
    
    // Форматирование UTM параметров
    const utmParts = [];
    if (utm?.utm_source) utmParts.push(`source: ${utm.utm_source}`);
    if (utm?.utm_campaign) utmParts.push(`campaign: ${utm.utm_campaign}`);
    if (utm?.utm_medium) utmParts.push(`medium: ${utm.utm_medium}`);
    if (utm?.utm_term) utmParts.push(`term: ${utm.utm_term}`);
    if (utm?.utm_content) utmParts.push(`content: ${utm.utm_content}`);
    
    const utmText = utmParts.length > 0 ? utmParts.join(', ') : 'без UTM';
    const promoText = promoId ? `\n🎫 <b>Промо:</b> ${promoId}` : '';
    
    // Форматирование времени
    const registrationTimeText = registrationTime.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const paymentTimeText = paymentTime.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `💰 <b>Новый платеж</b> #payment_success #completed_payment

👤 <b>Пользователь:</b> ${displayName} (${usernameText})
🆔 <b>ID:</b> <code>${userId}</code>
💳 <b>Платеж:</b> ${amount} ${currency.toUpperCase()}
🆔 <b>Payment ID:</b> <code>${paymentId}</code>
⏱️ <b>Время до платежа:</b> ${timeToPaymentText}
📊 <b>UTM:</b> ${utmText}${promoText}

📅 <b>Регистрация:</b> ${registrationTimeText} (МСК)
💳 <b>Платеж:</b> ${paymentTimeText} (МСК)`;
  }

  /**
   * Форматирование времени до платежа
   */
  private formatTimeToPayment(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}д ${hours % 24}ч ${minutes % 60}м`;
    } else if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }

  /**
   * Логирование создания платежа (когда пользователь нажал на тариф)
   */
  async logPaymentCreation(paymentCreationLog: PaymentCreationLog): Promise<void> {
    logger.info('Attempting to log payment creation', {
      isEnabled: this.isLoggerEnabled(),
      channelId: this.channelId,
      userId: paymentCreationLog.userId,
      paymentId: paymentCreationLog.paymentId,
    });

    if (!this.isLoggerEnabled()) {
      logger.warn('Channel logging disabled, skipping payment creation log', {
        isEnabled: this.isEnabled,
        channelId: this.channelId,
        logChannelEnabled: config.LOG_CHANNEL_ENABLED,
      });
      return;
    }

    try {
      const {
        userId,
        username,
        firstName,
        lastName,
        paymentId,
        amount,
        currency,
        tariffName,
        timestamp,
        utm,
        promoId,
      } = paymentCreationLog;

      // Форматирование имени пользователя
      const userInfo = [];
      if (firstName) userInfo.push(firstName);
      if (lastName) userInfo.push(lastName);
      const displayName = userInfo.length > 0 ? userInfo.join(' ') : 'Без имени';
      const usernameText = username ? `@${username}` : 'без username';
      
      // Форматирование UTM параметров
      const utmParts = [];
      if (utm?.utm_source) utmParts.push(`source: ${utm.utm_source}`);
      if (utm?.utm_campaign) utmParts.push(`campaign: ${utm.utm_campaign}`);
      if (utm?.utm_medium) utmParts.push(`medium: ${utm.utm_medium}`);
      if (utm?.utm_term) utmParts.push(`term: ${utm.utm_term}`);
      if (utm?.utm_content) utmParts.push(`content: ${utm.utm_content}`);
      
      const utmText = utmParts.length > 0 ? utmParts.join(', ') : 'без UTM';
      const promoText = promoId ? `\n🎫 <b>Промо:</b> ${promoId}` : '';
      const tariffText = tariffName ? `\n📦 <b>Тариф:</b> ${tariffName}` : '';
      
      // Форматирование времени
      const timestampText = timestamp.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Форматирование суммы
      const amountText = `${amount} ${currency}`;

      const message = `🛒 <b>Создание платежа</b> #payment_creation #new_payment

👤 <b>Пользователь:</b> ${displayName} (${usernameText})
🆔 <b>ID:</b> ${userId}
💳 <b>Платеж:</b> ${paymentId}
💰 <b>Сумма:</b> ${amountText}${tariffText}
📊 <b>UTM:</b> ${utmText}${promoText}
⏰ <b>Время:</b> ${timestampText} (МСК)`;

      const result = await this.bot.telegram.sendMessage(this.channelId!, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      logger.info('Payment creation logged to channel successfully', {
        userId,
        paymentId,
        amount,
        tariffName,
        messageId: result.message_id,
        channelId: this.channelId,
      });

    } catch (error: any) {
      logger.error('Failed to log payment creation to channel', {
        userId: paymentCreationLog.userId,
        paymentId: paymentCreationLog.paymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Логирование создания инвойса Telegram Stars
   */
  async logTelegramStarsInvoice(invoiceLog: TelegramStarsInvoiceLog): Promise<void> {
    if (!this.isEnabled || !this.channelId) {
      return;
    }

    try {
      const message = this.formatTelegramStarsInvoiceMessage(invoiceLog);
      
      await this.bot.telegram.sendMessage(this.channelId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      logger.info('Telegram Stars invoice logged to channel', {
        userId: invoiceLog.userId,
        paymentId: invoiceLog.paymentId,
        productName: invoiceLog.productName,
        amount: invoiceLog.amount,
        channelId: this.channelId,
      });

    } catch (error: any) {
      logger.error('Failed to log Telegram Stars invoice to channel', {
        userId: invoiceLog.userId,
        paymentId: invoiceLog.paymentId,
        channelId: this.channelId,
        error: error.message,
      });
    }
  }

  /**
   * Форматирование сообщения о создании инвойса Telegram Stars
   */
  private formatTelegramStarsInvoiceMessage(data: TelegramStarsInvoiceLog): string {
    const { 
      userId, 
      username, 
      firstName, 
      lastName, 
      paymentId, 
      productName,
      description,
      amount, 
      currency, 
      invoiceLink,
      isFlexible,
      timestamp,
      utm,
      promoId 
    } = data;
    
    // Форматирование имени пользователя
    const userInfo = [];
    if (firstName) userInfo.push(firstName);
    if (lastName) userInfo.push(lastName);
    const displayName = userInfo.length > 0 ? userInfo.join(' ') : 'Без имени';
    const usernameText = username ? `@${username}` : 'без username';
    
    // Форматирование UTM параметров
    const utmParts = [];
    if (utm?.utm_source) utmParts.push(`source: ${utm.utm_source}`);
    if (utm?.utm_campaign) utmParts.push(`campaign: ${utm.utm_campaign}`);
    if (utm?.utm_medium) utmParts.push(`medium: ${utm.utm_medium}`);
    if (utm?.utm_term) utmParts.push(`term: ${utm.utm_term}`);
    if (utm?.utm_content) utmParts.push(`content: ${utm.utm_content}`);
    
    const utmText = utmParts.length > 0 ? utmParts.join(', ') : 'без UTM';
    const promoText = promoId ? `\n🎫 <b>Промо:</b> ${promoId}` : '';
    const descriptionText = description ? `\n📝 <b>Описание:</b> ${description}` : '';
    const flexibleText = isFlexible ? '\n💡 <b>Гибкая цена:</b> включена' : '';
    
    // Форматирование времени
    const timestampText = timestamp.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `⭐ <b>Создан инвойс Telegram Stars</b> #telegram_stars #invoice_created

👤 <b>Пользователь:</b> ${displayName} (${usernameText})
🆔 <b>ID:</b> <code>${userId}</code>
📦 <b>Товар:</b> ${productName}${descriptionText}
💰 <b>Сумма:</b> ${amount} ${currency}${flexibleText}
🆔 <b>Payment ID:</b> <code>${paymentId}</code>
🔗 <b>Ссылка:</b> <a href="${invoiceLink}">Открыть инвойс</a>
📊 <b>UTM:</b> ${utmText}${promoText}
⏰ <b>Время:</b> ${timestampText} (МСК)`;
  }

  /**
   * Очистка кеша пользователей (для тестирования)
   */
  clearUserCache(): void {
    this.userStartCache.clear();
    logger.info('User start cache cleared');
  }
}