export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface LeadData {
  userId: number;
  utm: UTMParams;
  promoId?: string;
}

export interface Config {
  BOT_TOKEN: string;
  BOT_USERNAME: string;
  API_BASE_URL: string;
  MINI_APP_STARTAPP_ENABLED: boolean;
  MINI_APP_URL: string;
  PORT: number;
  WEBHOOK_PATH: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  SENTRY_DSN?: string;
  LOG_CHANNEL_ID?: string;
  LOG_CHANNEL_ENABLED: boolean;
  API_SECRET_KEY?: string;
  PAYMENT_LOG_ENABLED: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ParsedPayload {
  utm: UTMParams;
  promoId?: string;
}

export interface UserStartLog {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  utm: UTMParams;
  promoId?: string;
  timestamp: Date;
  isFirstTime?: boolean;
}

export interface PaymentLog {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  paymentId: string;
  amount: number;
  currency: string;
  registrationTime: Date;
  paymentTime: Date;
  timeToPayment: number; // in milliseconds
  utm?: UTMParams;
  promoId?: string;
}

export interface PaymentLogRequest {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  paymentId: string;
  amount: number;
  currency: string;
  registrationTime: string; // ISO string
  paymentTime: string; // ISO string
  utm?: UTMParams;
  promoId?: string;
}

export interface PaymentCreationLog {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  paymentId: string;
  amount: number;
  currency: string;
  tariffName?: string;
  timestamp: Date;
  utm?: UTMParams;
  promoId?: string;
}

export interface PaymentCreationLogRequest {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  paymentId: string;
  amount: number;
  currency: string;
  tariffName?: string;
  utm?: UTMParams;
  promoId?: string;
}