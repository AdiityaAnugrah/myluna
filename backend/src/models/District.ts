import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface DistrictAttributes {
  id: number;
  code: string | null;
  provinceId: number;
  regencyId: number;
  label: string;
  isActive: boolean;
}

class District extends Model<DistrictAttributes> implements DistrictAttributes {
  declare id: number;
  declare code: string | null;
  declare provinceId: number;
  declare regencyId: number;
  declare label: string;
  declare isActive: boolean;
}

District.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: true,
      unique: true,
    },
    provinceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'provinsi_id',
    },
    regencyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'kabupaten_id',
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
    tableName: 'kecamatan',
    timestamps: false,
  }
);

export default District;
