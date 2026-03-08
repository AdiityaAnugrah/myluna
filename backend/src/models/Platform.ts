import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PlatformAttributes {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PlatformCreationAttributes extends Optional<PlatformAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> {}

export class Platform extends Model<PlatformAttributes, PlatformCreationAttributes> implements PlatformAttributes {
  public id!: string;
  public name!: string;
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
