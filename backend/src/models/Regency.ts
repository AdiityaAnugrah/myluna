import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface RegencyAttributes {
  id: number;
  provinceId: number;
  label: string;
}

class Regency extends Model<RegencyAttributes> implements RegencyAttributes {
  declare id: number;
  declare provinceId: number;
  declare label: string;
}

Regency.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    provinceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'provinsi_id',
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'kabupaten',
    timestamps: false,
  }
);

export default Regency;
