import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type FeatureRole = 'USER' | 'TCP' | 'ADMIN' | 'SUPER_ADMIN' | 'DEV';

interface FeatureFlagAttributes {
  id: string;
  key: string;
  label: string;
  description: string | null;
  path: string | null;
  isEnabled: boolean;
  isDevelopment: boolean;
  allowedRoles: FeatureRole[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FeatureFlagCreationAttributes
  extends Optional<
    FeatureFlagAttributes,
    'id' | 'description' | 'path' | 'isEnabled' | 'isDevelopment' | 'allowedRoles' | 'sortOrder' | 'createdAt' | 'updatedAt'
  > {}

class FeatureFlag
  extends Model<FeatureFlagAttributes, FeatureFlagCreationAttributes>
  implements FeatureFlagAttributes
{
  declare id: string;
  declare key: string;
  declare label: string;
  declare description: string | null;
  declare path: string | null;
  declare isEnabled: boolean;
  declare isDevelopment: boolean;
  declare allowedRoles: FeatureRole[];
  declare sortOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

FeatureFlag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    path: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isDevelopment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    allowedRoles: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['DEV'],
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'feature_flags',
  }
);

export default FeatureFlag;
