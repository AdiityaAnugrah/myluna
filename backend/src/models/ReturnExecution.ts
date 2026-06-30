import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ReturnFinalDecision } from './ReturnTicket';

export enum ReturnExecutionStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
}

interface ReturnExecutionAttributes {
  id: string;
  ticketId: string;
  executionType: ReturnFinalDecision;
  status: ReturnExecutionStatus;
  notes: string | null;
  shippingService: string | null;
  shippingCost: string;
  expenseAmount: string;
  proofPhotos: string[] | null;
  executedBy: string | null;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReturnExecutionCreationAttributes
  extends Optional<
    ReturnExecutionAttributes,
    | 'id'
    | 'status'
    | 'notes'
    | 'shippingService'
    | 'shippingCost'
    | 'expenseAmount'
    | 'proofPhotos'
    | 'executedBy'
    | 'executedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ReturnExecution
  extends Model<ReturnExecutionAttributes, ReturnExecutionCreationAttributes>
  implements ReturnExecutionAttributes
{
  declare id: string;
  declare ticketId: string;
  declare executionType: ReturnFinalDecision;
  declare status: ReturnExecutionStatus;
  declare notes: string | null;
  declare shippingService: string | null;
  declare shippingCost: string;
  declare expenseAmount: string;
  declare proofPhotos: string[] | null;
  declare executedBy: string | null;
  declare executedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ReturnExecution.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    executionType: {
      type: DataTypes.ENUM(...Object.values(ReturnFinalDecision)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReturnExecutionStatus)),
      allowNull: false,
      defaultValue: ReturnExecutionStatus.PENDING,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingService: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    shippingCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    expenseAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    proofPhotos: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    executedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'return_executions',
    timestamps: true,
  }
);

export default ReturnExecution;
