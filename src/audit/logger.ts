/**
 * Pino-based audit logger with sensitive field redaction
 */

import pino from 'pino';

// Create base Pino logger with redaction
const logger = pino({
  level: 'info',
  // Redact sensitive fields automatically
  redact: {
    paths: [
      'password',
      'apiKey',
      'api_key',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
      'secret',
      '*.password',
      '*.apiKey',
      '*.api_key',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.authorization',
      '*.cookie',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  // Use pino-pretty in development, raw JSON in production
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Create child logger with component context
 */
export function createChildLogger(component: string): pino.Logger {
  return logger.child({ component });
}

// Pre-built child loggers for each subsystem
export const permissionLogger = createChildLogger('permission');
export const egressLogger = createChildLogger('egress');
export const validationLogger = createChildLogger('validation');
export const monitorLogger = createChildLogger('monitor');

/**
 * Log audit event with structured format
 */
export function auditEvent(event: {
  type: string;
  action: string;
  target?: string;
  approved?: boolean;
  details?: Record<string, unknown>;
}): void {
  logger.warn(
    {
      audit: true,
      timestamp: new Date().toISOString(),
      ...event,
    },
    `Audit: ${event.type} - ${event.action}`
  );
}

// Export base logger
export { logger };
