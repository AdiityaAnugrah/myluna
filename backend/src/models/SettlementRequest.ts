import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum SettlementRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

interface SettlementRequestAttributes {
  id: string;
  saleId: string;
  invoiceNumber: string | null;
  netAmount: string;
  settlementDate: Date;
  proofDocument: string | null;
  notes: string | null;
  status: SettlementRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  settlementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SettlementRequestCreationAttributes
  extends Optional<
    SettlementRequestAttributes,
    | 'id'
    | 'invoiceNumber'
    | 'proofDocument'
    | 'notes'
    | 'status'
    | 'reviewedBy'
    | 'reviewedAt'
    | 'reviewNotes'
    | 'settlementId'
    | 'createdAt'
    | 'updatedAt'
  > {}

class SettlementRequest
  extends Model<SettlementRequestAttributes, SettlementRequestCreationAttributes>
  implements SettlementRequestAttributes
{
  declare id: string;
  declare saleId: string;
  declare invoiceNumber: string | null;
  declare netAmount: string;
  declare settlementDate: Date;
  declare proofDocument: string | null;
  declare notes: string | null;
  declare status: SettlementRequestStatus;
  declare requestedBy: string;
  declare reviewedBy: string | null;
  declare reviewedAt: Date | null;
  declare reviewNotes: string | null;
  declare settlementId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SettlementRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    netAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    settlementDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    proofDocument: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SettlementRequestStatus)),
      allowNull: false,
      defaultValue: SettlementRequestStatus.PENDING,
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    settlementId: {
      type: DataTypes.UUID,
      allowNull: true,
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
    tableName: 'settlement_requests',
    timestamps: true,
    underscored: true,
  }
);

export default SettlementRequest;
