import { logger } from './logger';

export class SecurityLogger {
  /**
   * Log failed login attempt
   */
  static logFailedLogin(userId: string | undefined, ip: string, credential: string) {
    logger.warn('[SECURITY] Failed login attempt', {
      userId: userId || 'unknown',
      ip,
      credential: credential.substring(0, 3) + '***', // Partial masking
      timestamp: new Date().toISOString(),
      event: 'FAILED_LOGIN',
    });
  }

  /**
   * Log successful login
   */
  static logSuccessfulLogin(userId: string, ip: string, username: string) {
    logger.info('[SECURITY] Successful login', {
      userId,
      username,
      ip,
      timestamp: new Date().toISOString(),
      event: 'SUCCESSFUL_LOGIN',
    });
  }

  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(type: string, details: any, ip?: string) {
    logger.error('[SECURITY] Suspicious activity detected', {
      type,
      details,
      ip,
      timestamp: new Date().toISOString(),
      event: 'SUSPICIOUS_ACTIVITY',
    });
  }

  /**
   * Log unauthorized access attempt
   */
  static logUnauthorizedAccess(userId: string | undefined, resource: string, ip: string) {
    logger.warn('[SECURITY] Unauthorized access attempt', {
      userId: userId || 'unknown',
      resource,
      ip,
      timestamp: new Date().toISOString(),
      event: 'UNAUTHORIZED_ACCESS',
    });
  }

  /**
   * Log data modification
   */
  static logDataModification(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resource: string,
    resourceId: string
  ) {
    logger.info('[SECURITY] Data modification', {
      userId,
      action,
      resource,
      resourceId,
      timestamp: new Date().toISOString(),
      event: 'DATA_MODIFICATION',
    });
  }

  /**
   * Log excessive requests (potential DOS)
   */
  static logExcessiveRequests(ip: string, endpoint: string, count: number) {
    logger.warn('[SECURITY] Excessive requests detected', {
      ip,
      endpoint,
      requestCount: count,
      timestamp: new Date().toISOString(),
      event: 'EXCESSIVE_REQUESTS',
    });
  }
}
