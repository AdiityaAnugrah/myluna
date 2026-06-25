import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum SaleReturnStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  WAITING_ITEM_RETURN = 'WAITING_ITEM_RETURN',
  ITEM_RECEIVED = 'ITEM_RECEIVED',
  REJECTED = 'REJECTED',
  RESTOCKED = 'RESTOCKED',
  DAMAGED = 'DAMAGED',
  RESENT = 'RESENT',
  COMPLETED = 'COMPLETED',
}

export enum SaleReturnDecision {
  RESTOCK = 'RESTOCK',
  DAMAGED = 'DAMAGED',
  RESEND = 'RESEND',
}

interface SaleReturnAttributes {
  id: string;
  returnNumber: string;
  saleId: string;
  requestedBy: string;
  reviewedBy: string | null;
  receivedBy: string | null;
  processedBy: string | null;
  status: SaleReturnStatus;
  reason: string;
  requestDate: Date;
  reviewedAt: Date | null;
  receivedAt: Date | null;
  processedAt: Date | null;
  inspectionDecision: SaleReturnDecision | null;
  inspectionNotes: string | null;
  resendShippingService: string | null;
  resendShippingCost: string;
  financialImpactAmount: string;
  evidencePhotos: string[] | null;
  receivedPhotos: string[] | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleReturnCreationAttributes
  extends Optional<
    SaleReturnAttributes,
    | 'id'
    | 'reviewedBy'
    | 'receivedBy'
    | 'processedBy'
    | 'reviewedAt'
    | 'receivedAt'
    | 'processedAt'
    | 'inspectionDecision'
    | 'inspectionNotes'
    | 'resendShippingService'
    | 'resendShippingCost'
    | 'financialImpactAmount'
    | 'evidencePhotos'
    | 'receivedPhotos'
    | 'rejectionReason'
    | 'createdAt'
    | 'updatedAt'
  > {}

class SaleReturn
  extends Model<SaleReturnAttributes, SaleReturnCreationAttributes>
  implements SaleReturnAttributes
{
  declare id: string;
  declare returnNumber: string;
  declare saleId: string;
  declare requestedBy: string;
  declare reviewedBy: string | null;
  declare receivedBy: string | null;
  declare processedBy: string | null;
  declare status: SaleReturnStatus;
  declare reason: string;
  declare requestDate: Date;
  declare reviewedAt: Date | null;
  declare receivedAt: Date | null;
  declare processedAt: Date | null;
  declare inspectionDecision: SaleReturnDecision | null;
  declare inspectionNotes: string | null;
  declare resendShippingService: string | null;
  declare resendShippingCost: string;
  declare financialImpactAmount: string;
  declare evidencePhotos: string[] | null;
  declare receivedPhotos: string[] | null;
  declare rejectionReason: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare sale?: import('./Sale').default;
  declare items?: import('./SaleReturnItem').default[];
}

SaleReturn.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    returnNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    receivedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SaleReturnStatus)),
      allowNull: false,
      defaultValue: SaleReturnStatus.PENDING_REVIEW,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    requestDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    inspectionDecision: {
      type: DataTypes.ENUM(...Object.values(SaleReturnDecision)),
      allowNull: true,
    },
    inspectionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resendShippingService: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    resendShippingCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    financialImpactAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    evidencePhotos: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    receivedPhotos: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
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
    tableName: 'sale_returns',
    timestamps: true,
  }
);

export default SaleReturn;
