import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ReturnTicketParticipantAttributes {
  id: string;
  ticketId: string;
  userId: string;
  roleSnapshot: string;
  lastReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReturnTicketParticipantCreationAttributes
  extends Optional<ReturnTicketParticipantAttributes, 'id' | 'lastReadAt' | 'createdAt' | 'updatedAt'> {}

class ReturnTicketParticipant
  extends Model<ReturnTicketParticipantAttributes, ReturnTicketParticipantCreationAttributes>
  implements ReturnTicketParticipantAttributes
{
  declare id: string;
  declare ticketId: string;
  declare userId: string;
  declare roleSnapshot: string;
  declare lastReadAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ReturnTicketParticipant.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    roleSnapshot: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    lastReadAt: {
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
    tableName: 'return_ticket_participants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['ticketId', 'userId'],
      },
    ],
  }
);

export default ReturnTicketParticipant;
