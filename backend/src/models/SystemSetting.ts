import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SystemSettingAttributes {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SystemSettingCreationAttributes
  extends Optional<SystemSettingAttributes, 'id' | 'description' | 'createdAt' | 'updatedAt'> {}

class SystemSetting
  extends Model<SystemSettingAttributes, SystemSettingCreationAttributes>
  implements SystemSettingAttributes
{
  declare id: string;
  declare key: string;
  declare value: string;
  declare label: string;
  declare description: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SystemSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'system_settings',
  }
);

export default SystemSetting;
