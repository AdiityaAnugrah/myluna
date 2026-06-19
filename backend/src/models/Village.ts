import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface VillageAttributes {
  id: number;
  provinceId: number;
  regencyId: number;
  districtId: number;
  label: string;
  postalCode: string | null;
}

class Village extends Model<VillageAttributes> implements VillageAttributes {
  declare id: number;
  declare provinceId: number;
  declare regencyId: number;
  declare districtId: number;
  declare label: string;
  declare postalCode: string | null;
}

Village.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
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
    districtId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'kecamatan_id',
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'kodepos',
    },
  },
  {
    sequelize,
    tableName: 'kelurahan',
    timestamps: false,
  }
);

export default Village;
