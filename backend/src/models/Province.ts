import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ProvinceAttributes {
  id: number;
  label: string;
}

class Province extends Model<ProvinceAttributes> implements ProvinceAttributes {
  declare id: number;
  declare label: string;
}

Province.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'provinsi',
    timestamps: false,
  }
);

export default Province;
