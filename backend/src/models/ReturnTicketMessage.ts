import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum ReturnTicketMessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  DECISION = 'DECISION',
}

interface ReturnTicketMessageAttributes {
  id: string;
  ticketId: string;
  senderId: string | null;
  message: string;
  messageType: ReturnTicketMessageType;
  attachmentUrl: string | null;
  metadata: object | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReturnTicketMessageCreationAttributes
  extends Optional<
    ReturnTicketMessageAttributes,
    'id' | 'senderId' | 'messageType' | 'attachmentUrl' | 'metadata' | 'createdAt' | 'updatedAt'
  > {}

class ReturnTicketMessage
  extends Model<ReturnTicketMessageAttributes, ReturnTicketMessageCreationAttributes>
  implements ReturnTicketMessageAttributes
{
  declare id: string;
  declare ticketId: string;
  declare senderId: string | null;
  declare message: string;
  declare messageType: ReturnTicketMessageType;
  declare attachmentUrl: string | null;
  declare metadata: object | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ReturnTicketMessage.init(
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
    senderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    messageType: {
      type: DataTypes.ENUM(...Object.values(ReturnTicketMessageType)),
      allowNull: false,
      defaultValue: ReturnTicketMessageType.TEXT,
    },
    attachmentUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
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
    tableName: 'return_ticket_messages',
    timestamps: true,
  }
);

export default ReturnTicketMessage;
