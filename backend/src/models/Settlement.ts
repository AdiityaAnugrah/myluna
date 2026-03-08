import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SettlementAttributes {
  id: string;
  saleId: string;
  invoiceNumber: string | null;
  netAmount: string;
  settlementDate: Date;
  proofDocument: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SettlementCreationAttributes extends Optional<SettlementAttributes, 'id' | 'proofDocument' | 'notes' | 'createdAt' | 'updatedAt'> {}

class Settlement extends Model<SettlementAttributes, SettlementCreationAttributes> implements SettlementAttributes {
  declare id: string;
  declare saleId: string;
  declare invoiceNumber: string | null;
  declare netAmount: string;
  declare settlementDate: Date;
  declare proofDocument: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Settlement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'sales',
        key: 'id',
      },
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    netAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    settlementDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    proofDocument: {
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
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'settlements',
    timestamps: true,
    underscored: true,
  }
);

export default Settlement;
