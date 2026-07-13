import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum DisplayReturnStatus {
  DRAFT = 'DRAFT',
  READY_TO_SEND = 'READY_TO_SEND',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

interface DisplayReturnAttributes {
  id: string;
  letterNumber: string;
  letterSequence: number;
  letterMonth: number;
  letterYear: number;
  letterDate: Date;
  recipientName: string;
  recipientAddress: string;
  carriedBy: string | null;
  status: DisplayReturnStatus;
  notes: string | null;
  createdBy: string;
  sentBy: string | null;
  sentAt: Date | null;
  receivedBy: string | null;
  receivedAt: Date | null;
  completedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type DisplayReturnCreationAttributes = Optional<
  DisplayReturnAttributes,
  | 'id'
  | 'carriedBy'
  | 'status'
  | 'notes'
  | 'sentBy'
  | 'sentAt'
  | 'receivedBy'
  | 'receivedAt'
  | 'completedBy'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt'
>;

class DisplayReturn extends Model<DisplayReturnAttributes, DisplayReturnCreationAttributes> implements DisplayReturnAttributes {
  declare id: string;
  declare letterNumber: string;
  declare letterSequence: number;
  declare letterMonth: number;
  declare letterYear: number;
  declare letterDate: Date;
  declare recipientName: string;
  declare recipientAddress: string;
  declare carriedBy: string | null;
  declare status: DisplayReturnStatus;
  declare notes: string | null;
  declare createdBy: string;
  declare sentBy: string | null;
  declare sentAt: Date | null;
  declare receivedBy: string | null;
  declare receivedAt: Date | null;
  declare completedBy: string | null;
  declare completedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DisplayReturn.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    letterNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    letterSequence: { type: DataTypes.INTEGER, allowNull: false },
    letterMonth: { type: DataTypes.INTEGER, allowNull: false },
    letterYear: { type: DataTypes.INTEGER, allowNull: false },
    letterDate: { type: DataTypes.DATEONLY, allowNull: false },
    recipientName: { type: DataTypes.STRING(255), allowNull: false },
    recipientAddress: { type: DataTypes.TEXT, allowNull: false },
    carriedBy: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(DisplayReturnStatus)), allowNull: false, defaultValue: DisplayReturnStatus.DRAFT },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    sentBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    receivedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    receivedAt: { type: DataTypes.DATE, allowNull: true },
    completedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'display_returns' }
);

export default DisplayReturn;
