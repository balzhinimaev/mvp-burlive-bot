import { config } from './config';
import { UserStartLog, UTMParams } from './types';
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

    return `${statusEmoji} <b>${statusText}</b>

👤 <b>Пользователь:</b> ${displayName} (${usernameText})
🆔 <b>ID:</b> <code>${userId}</code>
📊 <b>UTM:</b> ${utmText}${promoText}
🕒 <b>Время:</b> ${timeText} (МСК)`;
  }

  /**
   * Проверка доступности канала
   */
  async testChannel(): Promise<boolean> {
    if (!this.channelId) {
      return false;
    }

    try {
      await this.bot.telegram.sendMessage(this.channelId, '🧪 Тест подключения к каналу логов', {
        disable_notification: true,
      });
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
   * Очистка кеша пользователей (для тестирования)
   */
  clearUserCache(): void {
    this.userStartCache.clear();
    logger.info('User start cache cleared');
  }
}