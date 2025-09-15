import { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { logger } from './utils';

/**
 * Middleware for API key authentication
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  // Skip authentication if API secret key is not configured
  if (!config.API_SECRET_KEY) {
    logger.warn('API_SECRET_KEY not configured, skipping authentication');
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.warn('Missing authorization header', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(401).json({
      success: false,
      error: 'Missing authorization header',
    });
    return;
  }

  // Check for Bearer token format
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (token !== config.API_SECRET_KEY) {
    logger.warn('Invalid API key', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      providedKey: token.substring(0, 8) + '...', // Log only first 8 chars for security
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  logger.debug('API key authentication successful', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  next();
}

/**
 * Middleware to check if payment logging is enabled
 */
export function requirePaymentLogging(req: Request, res: Response, next: NextFunction): void {
  if (!config.PAYMENT_LOG_ENABLED) {
    logger.warn('Payment logging is disabled', {
      ip: req.ip,
      endpoint: req.path,
    });
    
    res.status(503).json({
      success: false,
      error: 'Payment logging is currently disabled',
    });
    return;
  }

  next();
}
