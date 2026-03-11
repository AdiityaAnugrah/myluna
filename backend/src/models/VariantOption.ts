import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface VariantOptionAttributes {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VariantOptionCreationAttributes extends Optional<VariantOptionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class VariantOption extends Model<VariantOptionAttributes, VariantOptionCreationAttributes> implements VariantOptionAttributes {
  declare id: string;
  declare name: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

VariantOption.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
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
    tableName: 'variant_options',
  }
);

export default VariantOption;
