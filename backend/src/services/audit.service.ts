import { Transaction, Op } from 'sequelize';
import { AuditLog, AuditAction, User, Role } from '../models';

interface AuditLogData {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: object | null;
  after: object | null;
  ip: string;
  userAgent: string;
  duration?: number | null;   // seconds from form open to submit
  metadata?: object | null;  // extra info
}

export const auditService = {
  async log(data: AuditLogData, transaction?: Transaction) {
    return AuditLog.create(
      {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        before: data.before,
        after: data.after,
        ip: data.ip,
        userAgent: data.userAgent,
        duration: data.duration ?? null,
        metadata: data.metadata ?? null,
      },
      { transaction }
    );
  },

  async getAll(params: {
    page?: number;
    limit?: number;
    userId?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    currentUser?: any;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};
    const currentUser = params.currentUser;

    // Default: Show nothing if no user (should be protected by auth middleware anyway)
    if (!currentUser) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
    }

    // Role-based Access Control
    const userRoleName = currentUser.role?.name;

    // Filter Logic:
    // 1. SUPER_ADMIN: Sees everything.
    // 2. OTHERS (ADMIN, USER, TCP): Sees everything EXCEPT SUPER_ADMIN logs.

    // Specific User ID filtering (if requested manually via filter dropdown)
    if (params.userId && params.userId !== 'all') {
        where.userId = params.userId;
    }

    if (params.entity) where.entity = params.entity;

    if (params.entity) where.entity = params.entity;
    
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.$gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.$lte = new Date(params.endDate);
    }

    // Include logic for role filtering
    const include: any[] = [
        {
            model: User,
            as: 'user',
            include: [{ model: Role, as: 'role' }],
            required: true // Inner join to ensure we can filter by role
        }
    ];

    // If NOT SUPER_ADMIN, hide SUPER_ADMIN logs
    if (userRoleName !== 'SUPER_ADMIN') {
        // Method: Filter where User.Role.name != 'SUPER_ADMIN'
        include[0].include[0].where = {
            name: { [Op.ne]: 'SUPER_ADMIN' }
        };
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: include,
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  async cleanup() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const deletedCount = await AuditLog.destroy({
      where: {
        createdAt: {
          // @ts-ignore
          [Op.lt]: sixMonthsAgo,
        },
      },
    });

    return deletedCount;
  },
};
