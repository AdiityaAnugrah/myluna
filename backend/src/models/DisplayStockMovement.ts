import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum DisplayMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

interface DisplayStockMovementAttributes {
  id: string;
  productId: string;
  type: DisplayMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

type DisplayStockMovementCreationAttributes = Optional<DisplayStockMovementAttributes, 'id' | 'reference' | 'notes' | 'createdAt'>;

class DisplayStockMovement extends Model<DisplayStockMovementAttributes, DisplayStockMovementCreationAttributes> implements DisplayStockMovementAttributes {
  declare id: string;
  declare productId: string;
  declare type: DisplayMovementType;
  declare quantity: number;
  declare stockBefore: number;
  declare stockAfter: number;
  declare reference: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

DisplayStockMovement.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_products', key: 'id' } },
    type: { type: DataTypes.ENUM(...Object.values(DisplayMovementType)), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    stockBefore: { type: DataTypes.INTEGER, allowNull: false },
    stockAfter: { type: DataTypes.INTEGER, allowNull: false },
    reference: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'display_stock_movements', timestamps: false, updatedAt: false }
);

export default DisplayStockMovement;
