import dotenv from 'dotenv';
import { Config } from './types';

dotenv.config();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getEnvBoolean(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${name} is required`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

export const config: Config = {
  BOT_TOKEN: getEnvVar('BOT_TOKEN'),
  BOT_USERNAME: getEnvVar('BOT_USERNAME'),
  API_BASE_URL: getEnvVar('API_BASE_URL', 'https://burlive.ru/api/v2'),
  MINI_APP_STARTAPP_ENABLED: getEnvBoolean('MINI_APP_STARTAPP_ENABLED', true),
  MINI_APP_URL: getEnvVar('MINI_APP_URL', 'https://your-mini-app-domain.com'),
  PORT: getEnvNumber('PORT'),
  WEBHOOK_PATH: getEnvVar('WEBHOOK_PATH', '/webhook'),
  LOG_LEVEL: (getEnvVar('LOG_LEVEL', 'info') as Config['LOG_LEVEL']),
  SENTRY_DSN: process.env.SENTRY_DSN,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,
  LOG_CHANNEL_ENABLED: getEnvBoolean('LOG_CHANNEL_ENABLED', true),
  API_SECRET_KEY: process.env.API_SECRET_KEY,
  PAYMENT_LOG_ENABLED: getEnvBoolean('PAYMENT_LOG_ENABLED', true),
};

// Validate required config
const requiredVars = ['BOT_TOKEN', 'BOT_USERNAME', 'PORT'];
for (const varName of requiredVars) {
  if (!config[varName as keyof Config]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
