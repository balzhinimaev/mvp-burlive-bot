import { UTMParams, ParsedPayload } from './types';

/**
 * Парсинг UTM параметров из payload
 * Поддерживает как полные ключи (utm_source), так и сжатые (us)
 */
export function parsePayload(payload: string): ParsedPayload {
  const result: ParsedPayload = {
    utm: {},
  };

  if (!payload || payload.trim() === '') {
    return result;
  }

  try {
    // Декодируем URL-encoded строку
    const decodedPayload = decodeURIComponent(payload);
    
    // Разбиваем по & и парсим ключ=значение
    const params = decodedPayload.split('&');
    
    for (const param of params) {
      const [key, value] = param.split('=');
      if (!key || !value) continue;
      
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      
      // Маппинг сжатых ключей на полные
      const keyMapping: Record<string, keyof UTMParams> = {
        'us': 'utm_source',
        'um': 'utm_medium', 
        'uc': 'utm_campaign',
        'ut': 'utm_term',
        'ucn': 'utm_content',
        'utm_source': 'utm_source',
        'utm_medium': 'utm_medium',
        'utm_campaign': 'utm_campaign',
        'utm_term': 'utm_term',
        'utm_content': 'utm_content',
      };
      
      const mappedKey = keyMapping[trimmedKey];
      if (mappedKey) {
        result.utm[mappedKey] = trimmedValue;
      } else if (trimmedKey === 'promo' || trimmedKey === 'promo_id') {
        result.promoId = trimmedValue;
      }
    }
    
    console.log('[Utils] Parsed payload:', {
      original: payload,
      decoded: decodedPayload,
      parsed: result,
    });
    
  } catch (error) {
    console.error('[Utils] Error parsing payload:', error);
  }
  
  return result;
}

/**
 * Создание startapp параметра для Mini App
 */
export function createStartAppParam(utm: UTMParams, promoId?: string): string {
  const params: string[] = [];
  
  // Используем сжатые ключи для экономии символов (лимит 64)
  const shortMapping: Record<keyof UTMParams, string> = {
    utm_source: 'us',
    utm_medium: 'um',
    utm_campaign: 'uc',
    utm_term: 'ut',
    utm_content: 'ucn',
  };
  
  for (const [key, value] of Object.entries(utm)) {
    if (value) {
      const shortKey = shortMapping[key as keyof UTMParams];
      params.push(`${shortKey}=${encodeURIComponent(value)}`);
    }
  }
  
  if (promoId) {
    params.push(`promo=${encodeURIComponent(promoId)}`);
  }
  
  const result = params.join('&');
  
  // Проверяем лимит длины
  if (result.length > 64) {
    console.warn('[Utils] StartApp param exceeds 64 chars:', {
      length: result.length,
      param: result,
    });
  }
  
  return result;
}

/**
 * Создание глубокой ссылки для Mini App
 */
export function createMiniAppLink(botUsername: string, startAppParam: string): string {
  if (!startAppParam) {
    return `https://t.me/${botUsername}`;
  }
  
  return `https://t.me/${botUsername}?startapp=${encodeURIComponent(startAppParam)}`;
}

/**
 * Проверка валидности UTM параметров
 */
export function hasValidUtm(utm: UTMParams): boolean {
  return !!(utm.utm_source || utm.utm_campaign || utm.utm_medium);
}

/**
 * Логирование с уровнями
 */
export const logger = {
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  info: (message: string, meta?: any) => {
    console.info(`[INFO] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  },
};
