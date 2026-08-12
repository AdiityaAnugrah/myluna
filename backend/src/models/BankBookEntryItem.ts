import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface BankBookEntryItemAttributes {
  id: string;
  entryId: string;
  settlementId: string;
  saleId: string;
  invoiceNumber: string | null;
  platform: string;
  grossAmount: string;
  netAmount: string;
  differenceAmount: string;
  settlementDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface BankBookEntryItemCreationAttributes
  extends Optional<BankBookEntryItemAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class BankBookEntryItem
  extends Model<BankBookEntryItemAttributes, BankBookEntryItemCreationAttributes>
  implements BankBookEntryItemAttributes
{
  declare id: string;
  declare entryId: string;
  declare settlementId: string;
  declare saleId: string;
  declare invoiceNumber: string | null;
  declare platform: string;
  declare grossAmount: string;
  declare netAmount: string;
  declare differenceAmount: string;
  declare settlementDate: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BankBookEntryItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'entry_id',
    },
    settlementId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'settlement_id',
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sale_id',
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'invoice_number',
    },
    platform: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    grossAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'gross_amount',
    },
    netAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'net_amount',
    },
    differenceAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'difference_amount',
    },
    settlementDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'settlement_date',
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
    tableName: 'bank_book_entry_items',
    timestamps: true,
    underscored: true,
  }
);

export default BankBookEntryItem;
