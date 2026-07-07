import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DisplayCategoryAttributes {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type DisplayCategoryCreationAttributes = Optional<DisplayCategoryAttributes, 'id' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'>;

class DisplayCategory extends Model<DisplayCategoryAttributes, DisplayCategoryCreationAttributes> implements DisplayCategoryAttributes {
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DisplayCategory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'display_categories' }
);

export default DisplayCategory;
