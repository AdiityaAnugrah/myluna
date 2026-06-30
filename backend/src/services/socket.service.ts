import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verify } from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Role, User } from '../models';

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
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = verify(token, env.JWT_ACCESS_SECRET) as any;
        const userId = decoded.userId;
        if (!userId) {
          return next(new Error('Invalid token payload'));
        }

        const user = await User.findByPk(userId, {
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
          attributes: ['id', 'isActive'],
        });

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.data.userId = user.id;
        socket.data.userRole = (user as any).role?.name || null;
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

      socket.on('room:join', (room: string) => {
        if (typeof room === 'string' && room.trim()) {
          socket.join(room.trim());
        }
      });

      socket.on('room:leave', (room: string) => {
        if (typeof room === 'string' && room.trim()) {
          socket.leave(room.trim());
        }
      });

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

  // Emit notification to all users with a specific role
  emitToRole(role: 'ADMIN' | 'SUPER_ADMIN' | 'TCP', event: string, data: any) {
    if (!this.io) return;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      this.io.to('admins').emit(event, data);
    } else if (role === 'TCP') {
      this.io.to('tcp').emit(event, data);
    }
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

  emitToRoom(room: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
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
