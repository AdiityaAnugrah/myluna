import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { RequestStatus } from './ProductStatusRequest';

export enum ReturnType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
}

interface SaleReturnRequestAttributes {
  id: string;
  saleId: string;
  type: ReturnType;
  reason: string;
  status: RequestStatus;
  requestedBy: string;
  processedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleReturnRequestCreationAttributes extends Optional<SaleReturnRequestAttributes, 'id' | 'processedBy' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {}

class SaleReturnRequest extends Model<SaleReturnRequestAttributes, SaleReturnRequestCreationAttributes> implements SaleReturnRequestAttributes {
  declare id: string;
  declare saleId: string;
  declare type: ReturnType;
  declare reason: string;
  declare status: RequestStatus;
  declare requestedBy: string;
  declare processedBy: string | null;
  declare rejectionReason: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SaleReturnRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sales',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ReturnType)),
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RequestStatus)),
      allowNull: false,
      defaultValue: RequestStatus.PENDING,
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'sale_return_requests',
  }
);

export default SaleReturnRequest;
