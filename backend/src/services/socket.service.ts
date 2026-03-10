import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verify } from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class SocketService {
  private io: SocketIOServer | null = null;

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = verify(token, env.JWT_ACCESS_SECRET) as any;
        socket.data.userId = decoded.id;
        socket.data.userRole = decoded.role;
        next();
      } catch (error) {
        return next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.data.userId}`);

      // Join user-specific room
      socket.join(`user:${socket.data.userId}`);

      // Join role-specific room
      if (socket.data.userRole === 'ADMIN' || socket.data.userRole === 'SUPER_ADMIN') {
        socket.join('admins');
      }
      
      // Join TCP room for shipping notifications
      if (socket.data.userRole === 'TCP') {
        socket.join('tcp');
      }

      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.data.userId}`);
      });
    });

    logger.info('Socket.IO server initialized');
  }

  // Emit notification to specific user
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Emit notification to all admins
  emitToAdmins(event: string, data: any) {
    if (!this.io) return;
    this.io.to('admins').emit(event, data);
  }
  
  // Emit notification to TCP team
  emitToTCP(event: string, data: any) {
    if (!this.io) return;
    this.io.to('tcp').emit(event, data);
  }

  // Emit to all connected users
  emitToAll(event: string, data: any) {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  getIO() {
    return this.io;
  }

  // Broadcaster for real-time reactivity (tells frontend to invalidate React Query caches)
  broadcastDataRefresh(entity: string) {
    if (!this.io) return;
    this.io.emit('data:refresh', { entity });
    logger.info(`Broadcasted data:refresh for entity: ${entity}`);
  }
}

export const socketService = new SocketService();
