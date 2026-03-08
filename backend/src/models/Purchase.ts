import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

interface PurchaseAttributes {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  purchaseDate: Date;
  totalAmount: number;
  status: PurchaseStatus;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseCreationAttributes extends Optional<PurchaseAttributes, 'id' | 'notes' | 'createdAt' | 'updatedAt'> {}

class Purchase extends Model<PurchaseAttributes, PurchaseCreationAttributes> implements PurchaseAttributes {
  declare id: string;
  declare purchaseNumber: string;
  declare supplierId: string;
  declare purchaseDate: Date;
  declare totalAmount: number;
  declare status: PurchaseStatus;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  
  // Associations
  declare items?: import('./PurchaseItem').default[];
}

Purchase.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id',
      },
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PurchaseStatus)),
      allowNull: false,
      defaultValue: PurchaseStatus.PENDING,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'purchases',
  }
);

export default Purchase;

