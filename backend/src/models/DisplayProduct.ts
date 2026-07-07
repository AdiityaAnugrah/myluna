import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum DisplayProductStatus {
  DISPLAYED = 'DISPLAYED',
  STORED = 'STORED',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED',
  ARCHIVED = 'ARCHIVED',
}

export enum DisplayProductCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  MINOR_DAMAGE = 'MINOR_DAMAGE',
  DAMAGED = 'DAMAGED',
}

interface DisplayProductAttributes {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  supplierId: string | null;
  displayLocation: string | null;
  unit: string;
  stock: number;
  minStock: number;
  estimatedValue: string | null;
  condition: DisplayProductCondition;
  status: DisplayProductStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type DisplayProductCreationAttributes = Optional<DisplayProductAttributes, 'id' | 'description' | 'categoryId' | 'supplierId' | 'displayLocation' | 'unit' | 'stock' | 'minStock' | 'estimatedValue' | 'condition' | 'status' | 'notes' | 'isActive' | 'createdAt' | 'updatedAt'>;

class DisplayProduct extends Model<DisplayProductAttributes, DisplayProductCreationAttributes> implements DisplayProductAttributes {
  declare id: string;
  declare sku: string;
  declare name: string;
  declare description: string | null;
  declare categoryId: string | null;
  declare supplierId: string | null;
  declare displayLocation: string | null;
  declare unit: string;
  declare stock: number;
  declare minStock: number;
  declare estimatedValue: string | null;
  declare condition: DisplayProductCondition;
  declare status: DisplayProductStatus;
  declare notes: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DisplayProduct.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sku: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    categoryId: { type: DataTypes.UUID, allowNull: true, references: { model: 'display_categories', key: 'id' } },
    supplierId: { type: DataTypes.UUID, allowNull: true, references: { model: 'display_suppliers', key: 'id' } },
    displayLocation: { type: DataTypes.STRING(255), allowNull: true },
    unit: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pcs' },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    minStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estimatedValue: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    condition: { type: DataTypes.ENUM(...Object.values(DisplayProductCondition)), allowNull: false, defaultValue: DisplayProductCondition.GOOD },
    status: { type: DataTypes.ENUM(...Object.values(DisplayProductStatus)), allowNull: false, defaultValue: DisplayProductStatus.DISPLAYED },
    notes: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'display_products' }
);

export default DisplayProduct;
