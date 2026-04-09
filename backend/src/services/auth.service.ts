import { Op } from 'sequelize';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { jwtConfig } from '../config/jwt';
import { User, Role, RefreshToken } from '../models';
import { AuditAction } from '../models/AuditLog';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { auditService } from './audit.service';
import { SecurityLogger } from '../utils/security-logger';

export const authService = {
  async login(credential: string, password: string, ip: string = 'unknown') {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: credential },
          { username: credential }
        ]
      },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user || !user.isActive) {
      SecurityLogger.logFailedLogin(undefined, ip, credential);
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      SecurityLogger.logFailedLogin(user.id, ip, credential);
      console.log(`[AUTH-DEBUG] Password mismatch for user: ${user.username}`);
      console.log(`[AUTH-DEBUG] Input: ${password}, Stored Hash: ${user.password.substring(0, 10)}...`);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id },
      jwtConfig.access.secret,
      { expiresIn: jwtConfig.access.expiresIn } as SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      jwtConfig.refresh.secret,
      { expiresIn: jwtConfig.refresh.expiresIn } as SignOptions
    );

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
      userId: user.id,
      token: hashedRefreshToken,
      expiresAt,
    });

    // Log successful login
    SecurityLogger.logSuccessfulLogin(user.id, ip, user.username);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: (user as any).role.name,
      },
    };
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refresh.secret) as {
        userId: string;
      };

      // Find valid refresh token
      const tokenRecords = await RefreshToken.findAll({
        where: {
          userId: decoded.userId,
          isRevoked: false,
        },
      });

      let validToken = null;
      for (const record of tokenRecords) {
        const isMatch = await bcrypt.compare(refreshToken, record.token);
        if (isMatch && record.expiresAt > new Date()) {
          validToken = record;
          break;
        }
      }

      if (!validToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Role, as: 'role' }],
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Revoke old token
      validToken.isRevoked = true;
      await validToken.save();

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: user.id },
        jwtConfig.access.secret,
        { expiresIn: jwtConfig.access.expiresIn } as SignOptions
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        jwtConfig.refresh.secret,
        { expiresIn: jwtConfig.refresh.expiresIn } as SignOptions
      );

      // Store new refresh token
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await RefreshToken.create({
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  },

  async logout(userId: string) {
    await RefreshToken.update(
      { isRevoked: true },
      { where: { userId, isRevoked: false } }
    );

    // Log logout activity
    try {
      await auditService.log({
        userId: userId,
        action: 'LOGOUT' as any,
        entity: 'Auth',
        entityId: userId,
        before: null,
        after: null,
        ip: '',
        userAgent: '',
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  },

  async getMe(userId: string) {
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: (user as any).role.name,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Kata sandi saat ini salah');
    }

    // Set new password (the User model hook will hash it automatically)
    user.password = newPassword;
    await user.save();

    // Log the password change action
    try {
      await auditService.log({
        userId: userId,
        action: 'UPDATE' as any,
        entity: 'User',
        entityId: userId,
        before: null,
        after: { passwordChanged: true },
        ip: '',
        userAgent: '',
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }

    return true;
  },

  async heartbeat(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const now = new Date();
    const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt).getTime() : 0;
    const diffSeconds = Math.floor((now.getTime() - lastActivity) / 1000);

    // If last activity was less than 2 minutes ago, add the duration since last heartbeat
    // This assumes the heartbeat is sent every 1 minute.
    // If it's been more than 2 minutes, we just update the timestamp without adding duration
    // (meaning the user just came back from AFK or fresh session)
    if (diffSeconds > 0 && diffSeconds < 120) {
      user.totalDuration += diffSeconds;
    } else if (diffSeconds >= 180) {
      // Log Resume Activity if gap is significant
      try {
        await auditService.log({
          userId: user.id,
          action: AuditAction.RESUME,
          entity: 'Auth',
          entityId: user.id,
          before: null,
          after: { lastActivityGap: diffSeconds },
          ip: '',
          userAgent: '',
        });
      } catch (err) {
        console.error('Failed to log RESUME activity:', err);
      }
    }

    user.lastActivityAt = now;
    await user.save();

    return {
      lastActivityAt: user.lastActivityAt,
      totalDuration: user.totalDuration
    };
  },
};
