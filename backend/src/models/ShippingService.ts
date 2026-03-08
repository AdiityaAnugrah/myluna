import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ShippingServiceAttributes {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ShippingServiceCreationAttributes extends Optional<ShippingServiceAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class ShippingService extends Model<ShippingServiceAttributes, ShippingServiceCreationAttributes> implements ShippingServiceAttributes {
  declare id: string;
  declare name: string;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ShippingService.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
  },
  {
    sequelize,
    tableName: 'shipping_services',
  }
);

export default ShippingService;
