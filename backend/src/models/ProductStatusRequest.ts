import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
}

interface ProductStatusRequestAttributes {
  id: string;
  productId: string;
  requestedStatus: ProductStatus;
  reason: string;
  status: RequestStatus;
  requestedBy: string;
  processedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductStatusRequestCreationAttributes extends Optional<ProductStatusRequestAttributes, 'id' | 'processedBy' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {}

class ProductStatusRequest extends Model<ProductStatusRequestAttributes, ProductStatusRequestCreationAttributes> implements ProductStatusRequestAttributes {
  declare id: string;
  declare productId: string;
  declare requestedStatus: ProductStatus;
  declare reason: string;
  declare status: RequestStatus;
  declare requestedBy: string;
  declare processedBy: string | null;
  declare rejectionReason: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductStatusRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    requestedStatus: {
      type: DataTypes.ENUM(...Object.values(ProductStatus)),
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
    tableName: 'product_status_requests',
  }
);

export default ProductStatusRequest;
