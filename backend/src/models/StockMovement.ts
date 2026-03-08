import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

interface StockMovementAttributes {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

interface StockMovementCreationAttributes extends Optional<StockMovementAttributes, 'id' | 'reference' | 'notes' | 'createdAt'> {}

class StockMovement extends Model<StockMovementAttributes, StockMovementCreationAttributes> implements StockMovementAttributes {
  declare id: string;
  declare productId: string;
  declare type: MovementType;
  declare quantity: number;
  declare reference: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

StockMovement.init(
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
    type: {
      type: DataTypes.ENUM(...Object.values(MovementType)),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'stock_movements',
    timestamps: false,
    updatedAt: false,
  }
);

export default StockMovement;
