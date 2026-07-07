import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DisplaySupplierAttributes {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type DisplaySupplierCreationAttributes = Optional<DisplaySupplierAttributes, 'id' | 'contact' | 'phone' | 'email' | 'address' | 'isActive' | 'createdAt' | 'updatedAt'>;

class DisplaySupplier extends Model<DisplaySupplierAttributes, DisplaySupplierCreationAttributes> implements DisplaySupplierAttributes {
  declare id: string;
  declare name: string;
  declare contact: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare address: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DisplaySupplier.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    contact: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'display_suppliers' }
);

export default DisplaySupplier;
