import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface OtherIncomeAttributes {
  id: string;
  transactionDate: Date;
  bankName: string;
  buyerName: string;
  amount: string;
  proofDocument: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OtherIncomeCreationAttributes
  extends Optional<OtherIncomeAttributes, 'id' | 'proofDocument' | 'notes' | 'createdAt' | 'updatedAt'> {}

class OtherIncome
  extends Model<OtherIncomeAttributes, OtherIncomeCreationAttributes>
  implements OtherIncomeAttributes
{
  declare id: string;
  declare transactionDate: Date;
  declare bankName: string;
  declare buyerName: string;
  declare amount: string;
  declare proofDocument: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OtherIncome.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    transactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    buyerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
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
    tableName: 'other_incomes',
    timestamps: true,
    underscored: true,
  }
);

export default OtherIncome;
