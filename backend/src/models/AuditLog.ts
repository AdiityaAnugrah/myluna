import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  RESUME = 'RESUME',
}

interface AuditLogAttributes {
  id: string;
  userId: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: object | null;
  after: object | null;
  ip: string | null;
  userAgent: string | null;
  duration: number | null;
  metadata: object | null;
  createdAt: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'userId' | 'before' | 'after' | 'ip' | 'userAgent' | 'createdAt'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: string;
  declare userId: string | null;
  declare action: AuditAction;
  declare entity: string;
  declare entityId: string;
  declare before: object | null;
  declare after: object | null;
  declare ip: string | null;
  declare userAgent: string | null;
  declare duration: number | null;
  declare metadata: object | null;
  declare readonly createdAt: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.ENUM(...Object.values(AuditAction)),
      allowNull: false,
    },
    entity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    before: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    after: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds from form open to submit',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Extra tracking info (page, referrer, etc)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
    updatedAt: false,
  }
);

export default AuditLog;
