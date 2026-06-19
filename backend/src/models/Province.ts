import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ProvinceAttributes {
  id: number;
  code: string | null;
  label: string;
  isActive: boolean;
}

class Province extends Model<ProvinceAttributes> implements ProvinceAttributes {
  declare id: number;
  declare code: string | null;
  declare label: string;
  declare isActive: boolean;
}

Province.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(2),
      allowNull: true,
      unique: true,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'provinsi',
    timestamps: false,
  }
);

export default Province;
