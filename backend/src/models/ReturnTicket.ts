import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum ReturnTicketStatus {
  OPEN = 'OPEN',
  IN_DISCUSSION = 'IN_DISCUSSION',
  DECISION_FINALIZED = 'DECISION_FINALIZED',
  WAITING_TCP_EXECUTION = 'WAITING_TCP_EXECUTION',
  TCP_EXECUTING = 'TCP_EXECUTING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  OVERDUE = 'OVERDUE',
}

export enum ReturnFinalDecision {
  RESEND_UNIT = 'RESEND_UNIT',
  SEND_COMPONENT = 'SEND_COMPONENT',
  RESTOCK = 'RESTOCK',
}

interface ReturnTicketAttributes {
  id: string;
  ticketNumber: string;
  saleReturnId: string;
  createdBy: string;
  status: ReturnTicketStatus;
  deadlineAt: Date;
  finalDecision: ReturnFinalDecision | null;
  finalDecisionNotes: string | null;
  finalizedBy: string | null;
  finalizedAt: Date | null;
  tcpExecutorId: string | null;
  tcpStartedAt: Date | null;
  tcpCompletedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReturnTicketCreationAttributes
  extends Optional<
    ReturnTicketAttributes,
    | 'id'
    | 'status'
    | 'finalDecision'
    | 'finalDecisionNotes'
    | 'finalizedBy'
    | 'finalizedAt'
    | 'tcpExecutorId'
    | 'tcpStartedAt'
    | 'tcpCompletedAt'
    | 'resolvedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class ReturnTicket
  extends Model<ReturnTicketAttributes, ReturnTicketCreationAttributes>
  implements ReturnTicketAttributes
{
  declare id: string;
  declare ticketNumber: string;
  declare saleReturnId: string;
  declare createdBy: string;
  declare status: ReturnTicketStatus;
  declare deadlineAt: Date;
  declare finalDecision: ReturnFinalDecision | null;
  declare finalDecisionNotes: string | null;
  declare finalizedBy: string | null;
  declare finalizedAt: Date | null;
  declare tcpExecutorId: string | null;
  declare tcpStartedAt: Date | null;
  declare tcpCompletedAt: Date | null;
  declare resolvedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare returnRecord?: import('./SaleReturn').default;
  declare participants?: import('./ReturnTicketParticipant').default[];
  declare messages?: import('./ReturnTicketMessage').default[];
  declare executions?: import('./ReturnExecution').default[];
}

ReturnTicket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    saleReturnId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReturnTicketStatus)),
      allowNull: false,
      defaultValue: ReturnTicketStatus.OPEN,
    },
    deadlineAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    finalDecision: {
      type: DataTypes.ENUM(...Object.values(ReturnFinalDecision)),
      allowNull: true,
    },
    finalDecisionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    finalizedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tcpExecutorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    tcpStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tcpCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
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
    tableName: 'return_tickets',
    timestamps: true,
  }
);

export default ReturnTicket;
