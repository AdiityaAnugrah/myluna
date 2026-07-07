import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum DisplayRequestType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum DisplayRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

interface DisplayStockRequestAttributes {
  id: string;
  productId: string;
  type: DisplayRequestType;
  quantity: number;
  targetStock: number | null;
  reason: string;
  status: DisplayRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type DisplayStockRequestCreationAttributes = Optional<DisplayStockRequestAttributes, 'id' | 'targetStock' | 'status' | 'reviewedBy' | 'reviewedAt' | 'rejectionReason' | 'createdAt' | 'updatedAt'>;

class DisplayStockRequest extends Model<DisplayStockRequestAttributes, DisplayStockRequestCreationAttributes> implements DisplayStockRequestAttributes {
  declare id: string;
  declare productId: string;
  declare type: DisplayRequestType;
  declare quantity: number;
  declare targetStock: number | null;
  declare reason: string;
  declare status: DisplayRequestStatus;
  declare requestedBy: string;
  declare reviewedBy: string | null;
  declare reviewedAt: Date | null;
  declare rejectionReason: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DisplayStockRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_products', key: 'id' } },
    type: { type: DataTypes.ENUM(...Object.values(DisplayRequestType)), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    targetStock: { type: DataTypes.INTEGER, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(DisplayRequestStatus)), allowNull: false, defaultValue: DisplayRequestStatus.PENDING },
    requestedBy: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    reviewedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'display_stock_requests' }
);

export default DisplayStockRequest;
