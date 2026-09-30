import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum InventoryLoanItemCondition {
  GOOD = 'GOOD',
  MINOR_DAMAGE = 'MINOR_DAMAGE',
  DAMAGED = 'DAMAGED',
  OTHER = 'OTHER',
}

interface InventoryLoanItemAttributes {
  id: string;
  loanId: string;
  productId: string;
  variantName: string | null;
  quantity: number;
  condition: InventoryLoanItemCondition;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryLoanItemCreationAttributes
  extends Optional<InventoryLoanItemAttributes, 'id' | 'variantName' | 'notes' | 'createdAt' | 'updatedAt'> {}

class InventoryLoanItem
  extends Model<InventoryLoanItemAttributes, InventoryLoanItemCreationAttributes>
  implements InventoryLoanItemAttributes
{
  declare id: string;
  declare loanId: string;
  declare productId: string;
  declare variantName: string | null;
  declare quantity: number;
  declare condition: InventoryLoanItemCondition;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

InventoryLoanItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'loan_id',
      references: {
        model: 'inventory_loans',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id',
      },
    },
    variantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'variant_name',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    condition: {
      type: DataTypes.ENUM(...Object.values(InventoryLoanItemCondition)),
      allowNull: false,
      defaultValue: InventoryLoanItemCondition.GOOD,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt',
    },
  },
  {
    sequelize,
    tableName: 'inventory_loan_items',
  }
);

export default InventoryLoanItem;
