import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ReturnFinalOutcome, ReturnInspectionResult, SaleReturnDecision } from './SaleReturn';

interface SaleReturnItemAttributes {
  id: string;
  returnId: string;
  saleItemId: string;
  productId: string;
  variantName: string | null;
  qtySold: number;
  qtyRequested: number;
  qtyReceived: number | null;
  resolution: SaleReturnDecision | null;
  replacementProductId: string | null;
  replacementVariantName: string | null;
  replacementQty: number | null;
  inspectionResult: ReturnInspectionResult | null;
  finalOutcome: ReturnFinalOutcome | null;
  qtyWrittenOff: number | null;
  qtyRepaired: number | null;
  qtyRestocked: number | null;
  itemNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleReturnItemCreationAttributes
  extends Optional<
    SaleReturnItemAttributes,
    | 'id'
    | 'variantName'
    | 'qtyReceived'
    | 'resolution'
    | 'replacementProductId'
    | 'replacementVariantName'
    | 'replacementQty'
    | 'inspectionResult'
    | 'finalOutcome'
    | 'qtyWrittenOff'
    | 'qtyRepaired'
    | 'qtyRestocked'
    | 'itemNotes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class SaleReturnItem
  extends Model<SaleReturnItemAttributes, SaleReturnItemCreationAttributes>
  implements SaleReturnItemAttributes
{
  declare id: string;
  declare returnId: string;
  declare saleItemId: string;
  declare productId: string;
  declare variantName: string | null;
  declare qtySold: number;
  declare qtyRequested: number;
  declare qtyReceived: number | null;
  declare resolution: SaleReturnDecision | null;
  declare replacementProductId: string | null;
  declare replacementVariantName: string | null;
  declare replacementQty: number | null;
  declare inspectionResult: ReturnInspectionResult | null;
  declare finalOutcome: ReturnFinalOutcome | null;
  declare qtyWrittenOff: number | null;
  declare qtyRepaired: number | null;
  declare qtyRestocked: number | null;
  declare itemNotes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SaleReturnItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    returnId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    saleItemId: {
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
    qtySold: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    qtyRequested: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    qtyReceived: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resolution: {
      type: DataTypes.ENUM(...Object.values(SaleReturnDecision)),
      allowNull: true,
    },
    replacementProductId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    replacementVariantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    replacementQty: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    inspectionResult: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    finalOutcome: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    qtyWrittenOff: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qtyRepaired: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qtyRestocked: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    itemNotes: {
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
    tableName: 'sale_return_items',
    timestamps: true,
  }
);

export default SaleReturnItem;
