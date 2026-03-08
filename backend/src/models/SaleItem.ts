import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SaleItemAttributes {
  id: string;
  saleId: string;
  productId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleItemCreationAttributes extends Optional<SaleItemAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class SaleItem extends Model<SaleItemAttributes, SaleItemCreationAttributes> implements SaleItemAttributes {
  declare id: string;
  declare saleId: string;
  declare productId: string;
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
