import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SaleItemAttributes {
  id: string;
  saleId: string;
  itemType: 'PRODUCT' | 'COMPONENT';
  productId: string | null;
  componentName: string | null;
  componentNotes: string | null;
  variantName?: string | null;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleItemCreationAttributes extends Optional<SaleItemAttributes, 'id' | 'itemType' | 'productId' | 'componentName' | 'componentNotes' | 'createdAt' | 'updatedAt'> {}

class SaleItem extends Model<SaleItemAttributes, SaleItemCreationAttributes> implements SaleItemAttributes {
  declare id: string;
  declare saleId: string;
  declare itemType: 'PRODUCT' | 'COMPONENT';
  declare productId: string | null;
  declare componentName: string | null;
  declare componentNotes: string | null;
  declare variantName: string | null;
  declare quantity: number;
  declare price: number;
  declare discount: number;
  declare subtotal: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SaleItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sales',
        key: 'id',
      },
    },
    itemType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PRODUCT',
      field: 'item_type',
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    componentName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'component_name',
    },
    componentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'component_notes',
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
    discount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'sale_items',
  }
);

export default SaleItem;
