import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export enum EntityType {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  SUPPLIER = 'SUPPLIER',
  STOCK = 'STOCK',
  SETTLEMENT = 'SETTLEMENT',
  SALE = 'SALE',
}

export enum RequestType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ChangeRequest extends Model {
  public id!: string;
  public entityType!: EntityType;
  public entityId!: string | null;
  public requestType!: RequestType;
  public status!: RequestStatus;
  public payload!: any;
  public requestedBy!: string;
  public reviewedBy!: string | null;
  public rejectionReason!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations (optional typing)
  public readonly requester?: User;
  public readonly reviewer?: User;
}

ChangeRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.ENUM(...Object.values(EntityType)),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    requestType: {
      type: DataTypes.ENUM(...Object.values(RequestType)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RequestStatus)),
      defaultValue: RequestStatus.PENDING,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'change_requests',
    timestamps: true,
  }
);

// Define Associations
ChangeRequest.belongsTo(User, { as: 'requester', foreignKey: 'requestedBy' });
ChangeRequest.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewedBy' });

export default ChangeRequest;
