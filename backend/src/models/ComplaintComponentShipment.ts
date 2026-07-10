import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ComplaintComponentShipmentAttributes {
  id: string;
  complaintId: string;
  productId: string;
  variantName: string | null;
  quantity: number;
  stockMovementId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ComplaintComponentShipmentCreationAttributes
  extends Optional<
    ComplaintComponentShipmentAttributes,
    'id' | 'variantName' | 'stockMovementId' | 'notes' | 'createdAt' | 'updatedAt'
  > {}

class ComplaintComponentShipment
  extends Model<ComplaintComponentShipmentAttributes, ComplaintComponentShipmentCreationAttributes>
  implements ComplaintComponentShipmentAttributes
{
  declare id: string;
  declare complaintId: string;
  declare productId: string;
  declare variantName: string | null;
  declare quantity: number;
  declare stockMovementId: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ComplaintComponentShipment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    complaintId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    variantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stockMovementId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
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
    tableName: 'complaint_component_shipments',
    timestamps: true,
  }
);

export default ComplaintComponentShipment;
