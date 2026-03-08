import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductVariantAttributes {
  id: string;
  productId: string;
  name: string;
  value: string;
  priceAdjustment: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVariantCreationAttributes extends Optional<ProductVariantAttributes, 'id' | 'name' | 'priceAdjustment' | 'stock' | 'createdAt' | 'updatedAt'> {}

class ProductVariant extends Model<ProductVariantAttributes, ProductVariantCreationAttributes> implements ProductVariantAttributes {
  declare id: string;
  declare productId: string;
  declare name: string;
  declare value: string;
  declare priceAdjustment: number;
  declare stock: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductVariant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: '',
    },
    value: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    priceAdjustment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'product_variants',
  }
);

export default ProductVariant;
