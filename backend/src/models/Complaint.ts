import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum ComplaintStatus {
  PENDING_TCP_REVIEW = 'PENDING_TCP_REVIEW',
  REJECTED_BY_TCP = 'REJECTED_BY_TCP',
  ACCEPTED_BY_TCP = 'ACCEPTED_BY_TCP',
  REPLACEMENT_SHIPPED = 'REPLACEMENT_SHIPPED',
}

interface ComplaintAttributes {
  id: string;
  complaintNumber: string;
  saleId: string;
  saleNumberSnapshot: string;
  customerNameSnapshot: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  recipientAddressNote: string | null;
  reason: string;
  complaintDate: Date;
  complaintPhoto: string;
  complaintPhotos: string[] | null;
  salesInformation: string | null;
  complaintReceiptPdf: string | null;
  complaintVideo: string | null;
  complaintVideoOriginalSize: number | null;
  complaintVideoCompressedSize: number | null;
  status: ComplaintStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  replacementProofDocument: string | null;
  shippedBy: string | null;
  shippedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ComplaintCreationAttributes
  extends Optional<
    ComplaintAttributes,
    | 'id'
    | 'customerNameSnapshot'
    | 'recipientName'
    | 'recipientPhone'
    | 'recipientAddress'
    | 'recipientAddressNote'
    | 'complaintPhotos'
    | 'salesInformation'
    | 'complaintReceiptPdf'
    | 'complaintVideo'
    | 'complaintVideoOriginalSize'
    | 'complaintVideoCompressedSize'
    | 'status'
    | 'reviewedBy'
    | 'reviewedAt'
    | 'rejectionReason'
    | 'replacementProofDocument'
    | 'shippedBy'
    | 'shippedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Complaint
  extends Model<ComplaintAttributes, ComplaintCreationAttributes>
  implements ComplaintAttributes
{
  declare id: string;
  declare complaintNumber: string;
  declare saleId: string;
  declare saleNumberSnapshot: string;
  declare customerNameSnapshot: string | null;
  declare recipientName: string | null;
  declare recipientPhone: string | null;
  declare recipientAddress: string | null;
  declare recipientAddressNote: string | null;
  declare reason: string;
  declare complaintDate: Date;
  declare complaintPhoto: string;
  declare complaintPhotos: string[] | null;
  declare salesInformation: string | null;
  declare complaintReceiptPdf: string | null;
  declare complaintVideo: string | null;
  declare complaintVideoOriginalSize: number | null;
  declare complaintVideoCompressedSize: number | null;
  declare status: ComplaintStatus;
  declare reviewedBy: string | null;
  declare reviewedAt: Date | null;
  declare rejectionReason: string | null;
  declare replacementProofDocument: string | null;
  declare shippedBy: string | null;
  declare shippedAt: Date | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Complaint.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    complaintNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sales',
        key: 'id',
      },
    },
    saleNumberSnapshot: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    customerNameSnapshot: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    recipientName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    recipientPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    recipientAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recipientAddressNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    complaintDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    complaintPhoto: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    complaintPhotos: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    salesInformation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    complaintReceiptPdf: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    complaintVideo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    complaintVideoOriginalSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    complaintVideoCompressedSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ComplaintStatus)),
      allowNull: false,
      defaultValue: ComplaintStatus.PENDING_TCP_REVIEW,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    replacementProofDocument: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    shippedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
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
    tableName: 'complaints',
  }
);

export default Complaint;
