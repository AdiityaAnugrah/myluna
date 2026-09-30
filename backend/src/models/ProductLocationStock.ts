import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum ProductStockLocation {
  CENTER = 'CENTER',
}

interface ProductLocationStockAttributes {
  id: string;
  productId: string;
  variantName: string | null;
  location: ProductStockLocation;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductLocationStockCreationAttributes
  extends Optional<ProductLocationStockAttributes, 'id' | 'variantName' | 'stock' | 'createdAt' | 'updatedAt'> {}

class ProductLocationStock
  extends Model<ProductLocationStockAttributes, ProductLocationStockCreationAttributes>
  implements ProductLocationStockAttributes
{
  declare id: string;
  declare productId: string;
  declare variantName: string | null;
  declare location: ProductStockLocation;
  declare stock: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductLocationStock.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    location: {
      type: DataTypes.ENUM(...Object.values(ProductStockLocation)),
      allowNull: false,
      defaultValue: ProductStockLocation.CENTER,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'product_location_stocks',
  }
);

export default ProductLocationStock;
