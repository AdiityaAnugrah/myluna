import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface RegencyAttributes {
  id: number;
  code: string | null;
  provinceId: number;
  label: string;
  isActive: boolean;
}

class Regency extends Model<RegencyAttributes> implements RegencyAttributes {
  declare id: number;
  declare code: string | null;
  declare provinceId: number;
  declare label: string;
  declare isActive: boolean;
}

Regency.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(4),
      allowNull: true,
      unique: true,
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
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'kabupaten',
    timestamps: false,
  }
);

export default Regency;
