import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { auditService } from './services/audit.service';
import { socketService } from './services/socket.service';

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    socketService.initialize(httpServer);

    // Start server
    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API Prefix: ${env.API_PREFIX}`);
      logger.info(`Socket.IO enabled`);

      // Schedule daily cleanup of old audit logs (keep 6 months)
      setInterval(async () => {
        try {
          logger.info('Running daily audit log cleanup...');
          const deleted = await auditService.cleanup();
          logger.info(`Cleanup complete. Deleted ${deleted} old logs.`);
        } catch (error) {
          logger.error('Audit cleanup failed:', error);
        }
      }, 86400000); // 24 hours
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
