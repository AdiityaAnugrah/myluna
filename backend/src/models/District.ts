import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface DistrictAttributes {
  id: number;
  provinceId: number;
  regencyId: number;
  label: string;
}

class District extends Model<DistrictAttributes> implements DistrictAttributes {
  declare id: number;
  declare provinceId: number;
  declare regencyId: number;
  declare label: string;
}

District.init(
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
    regencyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'kabupaten_id',
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'kecamatan',
    timestamps: false,
  }
);

export default District;
