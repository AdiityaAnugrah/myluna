import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PlatformAttributes {
  id: string;
  name: string;
  feePercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PlatformCreationAttributes extends Optional<PlatformAttributes, 'id' | 'feePercentage' | 'createdAt' | 'updatedAt' | 'isActive'> {}

export class Platform extends Model<PlatformAttributes, PlatformCreationAttributes> implements PlatformAttributes {
  public id!: string;
  public name!: string;
  public feePercentage!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Platform.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    feePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 25,
      field: 'fee_percentage',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: 'platforms',
  }
);
