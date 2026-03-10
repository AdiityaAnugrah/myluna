import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductAttributes {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  imageUrl: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  warrantyPrice: number | null;
  stock: number;
  minStock: number;
  isActive: boolean;
  variants: any | null;
  marketplaceLinks: any | null;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'description' | 'imageUrl' | 'length' | 'width' | 'height' | 'weight' | 'stock' | 'minStock' | 'isActive' | 'variants' | 'marketplaceLinks' | 'slug' | 'warrantyPrice' | 'createdAt' | 'updatedAt'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  declare id: string;
  declare sku: string;
  declare name: string;
  declare description: string | null;
  declare categoryId: string;
  declare imageUrl: string | null;
  declare length: number | null;
  declare width: number | null;
  declare height: number | null;
  declare weight: number | null;
  declare unit: string;
  declare purchasePrice: number;
  declare sellingPrice: number;
  declare warrantyPrice: number | null;
  declare stock: number;
  declare minStock: number;
  declare isActive: boolean;
  declare variants: any | null;
  declare marketplaceLinks: any | null;
  declare slug: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    length: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    warrantyPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      field: 'warranty_price',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    variants: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    marketplaceLinks: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'products',
  }
);

export default Product;

