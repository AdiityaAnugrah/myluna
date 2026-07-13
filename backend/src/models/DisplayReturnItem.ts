import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DisplayReturnItemAttributes {
  id: string;
  displayReturnId: string;
  displayProductId: string;
  productId: string;
  productVariantId: string | null;
  skuSnapshot: string;
  productNameSnapshot: string;
  variantSnapshot: string | null;
  quantity: number;
  condition: string;
  reason: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type DisplayReturnItemCreationAttributes = Optional<DisplayReturnItemAttributes, 'id' | 'productVariantId' | 'variantSnapshot' | 'notes' | 'createdAt' | 'updatedAt'>;

class DisplayReturnItem extends Model<DisplayReturnItemAttributes, DisplayReturnItemCreationAttributes> implements DisplayReturnItemAttributes {
  declare id: string;
  declare displayReturnId: string;
  declare displayProductId: string;
  declare productId: string;
  declare productVariantId: string | null;
  declare skuSnapshot: string;
  declare productNameSnapshot: string;
  declare variantSnapshot: string | null;
  declare quantity: number;
  declare condition: string;
  declare reason: string;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DisplayReturnItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    displayReturnId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_returns', key: 'id' } },
    displayProductId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_products', key: 'id' } },
    productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'products', key: 'id' } },
    productVariantId: { type: DataTypes.UUID, allowNull: true, references: { model: 'product_variants', key: 'id' } },
    skuSnapshot: { type: DataTypes.STRING(100), allowNull: false },
    productNameSnapshot: { type: DataTypes.STRING(255), allowNull: false },
    variantSnapshot: { type: DataTypes.STRING(255), allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    condition: { type: DataTypes.STRING(100), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'display_return_items' }
);

export default DisplayReturnItem;
