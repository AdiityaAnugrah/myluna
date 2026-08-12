import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum BankBookEntryStatus {
  MATCHED = 'MATCHED',
  CANCELLED = 'CANCELLED',
}

interface BankBookEntryAttributes {
  id: string;
  bankName: string;
  startDate: Date;
  endDate: Date;
  bankAmount: string;
  selectedTotal: string;
  differenceAmount: string;
  status: BankBookEntryStatus;
  notes: string | null;
  createdBy: string;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BankBookEntryCreationAttributes
  extends Optional<
    BankBookEntryAttributes,
    | 'id'
    | 'status'
    | 'notes'
    | 'cancelledBy'
    | 'cancelledAt'
    | 'cancelReason'
    | 'createdAt'
    | 'updatedAt'
  > {}

class BankBookEntry
  extends Model<BankBookEntryAttributes, BankBookEntryCreationAttributes>
  implements BankBookEntryAttributes
{
  declare id: string;
  declare bankName: string;
  declare startDate: Date;
  declare endDate: Date;
  declare bankAmount: string;
  declare selectedTotal: string;
  declare differenceAmount: string;
  declare status: BankBookEntryStatus;
  declare notes: string | null;
  declare createdBy: string;
  declare cancelledBy: string | null;
  declare cancelledAt: Date | null;
  declare cancelReason: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BankBookEntry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bankName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'bank_name',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'end_date',
    },
    bankAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'bank_amount',
    },
    selectedTotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'selected_total',
    },
    differenceAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'difference_amount',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BankBookEntryStatus)),
      allowNull: false,
      defaultValue: BankBookEntryStatus.MATCHED,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    cancelledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'cancelled_by',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at',
    },
    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cancel_reason',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'bank_book_entries',
    timestamps: true,
    underscored: true,
  }
);

export default BankBookEntry;
