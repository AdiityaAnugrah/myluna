import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface HistoricalSettlementAttributes {
  id: string;
  amount: string;
  settlementDate: Date;
  bankName: string | null;
  buyerName: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface HistoricalSettlementCreationAttributes
  extends Optional<HistoricalSettlementAttributes, 'id' | 'bankName' | 'buyerName' | 'notes' | 'createdAt' | 'updatedAt'> {}

class HistoricalSettlement
  extends Model<HistoricalSettlementAttributes, HistoricalSettlementCreationAttributes>
  implements HistoricalSettlementAttributes
{
  declare id: string;
  declare amount: string;
  declare settlementDate: Date;
  declare bankName: string | null;
  declare buyerName: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

HistoricalSettlement.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    settlementDate: { type: DataTypes.DATEONLY, allowNull: false },
    bankName: { type: DataTypes.STRING(100), allowNull: true },
    buyerName: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'historical_settlements',
    timestamps: true,
    underscored: true,
  }
);

export default HistoricalSettlement;
