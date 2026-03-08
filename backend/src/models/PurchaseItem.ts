import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PurchaseItemAttributes {
  id: string;
  purchaseId: string;
  productId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseItemCreationAttributes extends Optional<PurchaseItemAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class PurchaseItem extends Model<PurchaseItemAttributes, PurchaseItemCreationAttributes> implements PurchaseItemAttributes {
  declare id: string;
  declare purchaseId: string;
  declare productId: string;
  declare variantName: string | null;
  declare quantity: number;
  declare price: number;
  declare subtotal: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PurchaseItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'purchases',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    variantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
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
    tableName: 'purchase_items',
  }
);

export default PurchaseItem;

