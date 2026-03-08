import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ExpenseAttributes {
  id: string;
  category: 'SHIPPING' | 'SALARY' | 'RENT' | 'UTILITIES' | 'ADMIN' | 'OTHER';
  description: string;
  amount: string;
  expenseDate: Date;
  receiptDocument: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseCreationAttributes extends Optional<ExpenseAttributes, 'id' | 'receiptDocument' | 'notes' | 'createdAt' | 'updatedAt'> {}

class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
  public id!: string;
  public category!: 'SHIPPING' | 'SALARY' | 'RENT' | 'UTILITIES' | 'ADMIN' | 'OTHER';
  public description!: string;
  public amount!: string;
  public expenseDate!: Date;
  public receiptDocument!: string | null;
  public notes!: string | null;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Expense.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    category: {
      type: DataTypes.ENUM('SHIPPING', 'SALARY', 'RENT', 'UTILITIES', 'ADMIN', 'OTHER'),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    receiptDocument: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'expenses',
    timestamps: true,
  }
);

export default Expense;
