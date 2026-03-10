import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum SaleStatus {
  PENDING = 'PENDING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
  SETTLED = 'SETTLED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CREDIT = 'CREDIT',
}

export enum SalePlatform {
  OFFLINE_STORE = 'OFFLINE_STORE',
  TOKOPEDIA = 'TOKOPEDIA',
  SHOPEE = 'SHOPEE',
  TIKTOK_SHOP = 'TIKTOK_SHOP',
  LAZADA = 'LAZADA',
  OTHER = 'OTHER',
}

// Enum ShippingService removed in favor of dynamic table


interface SaleAttributes {
  id: string;
  saleNumber: string;
  saleDate: Date;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  platform: SalePlatform;
  status: SaleStatus;
  notes: string | null;
  shippingService: string | null;
  shippingAddress: string | null;
  shippingDocument: string | null;
  processedAt: Date | null;
  isInitialBalance: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleCreationAttributes extends Optional<SaleAttributes, 'id' | 'customerName' | 'customerPhone' | 'notes' | 'shippingService' | 'shippingAddress' | 'shippingDocument' | 'processedAt' | 'isInitialBalance' | 'createdAt' | 'updatedAt'> {}

class Sale extends Model<SaleAttributes, SaleCreationAttributes> implements SaleAttributes {
  declare id: string;
  declare saleNumber: string;
  declare saleDate: Date;
  declare customerName: string | null;
  declare customerPhone: string | null;
  declare totalAmount: number;
  declare paymentMethod: PaymentMethod;
  declare platform: SalePlatform;
  declare status: SaleStatus;
  declare notes: string | null;
  declare shippingService: string | null;
  declare shippingAddress: string | null;
  declare shippingDocument: string | null;
  declare processedAt: Date | null;
  declare isInitialBalance: boolean;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Associations
  declare items?: import('./SaleItem').default[];
  declare settlement?: import('./Settlement').default;
}

Sale.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    saleDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paymentMethod: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
      defaultValue: PaymentMethod.CASH,
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'OFFLINE_STORE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SaleStatus)),
      allowNull: false,
      defaultValue: SaleStatus.PENDING,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingService: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingDocument: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
    },
    isInitialBalance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'isInitialBalance',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
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
    tableName: 'sales',
  }
);

export default Sale;
