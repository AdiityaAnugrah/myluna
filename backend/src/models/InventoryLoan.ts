import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum InventoryLoanDirection {
  TO_CENTER = 'TO_CENTER',
  FROM_CENTER = 'FROM_CENTER',
}

export enum InventoryLoanStatus {
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

interface InventoryLoanAttributes {
  id: string;
  loanNumber: string;
  direction: InventoryLoanDirection;
  loanDate: Date;
  borrowerName: string;
  targetName: string;
  notes: string | null;
  submittedSignatureName: string | null;
  submittedSignature: string | null;
  acknowledgedSignatureName: string | null;
  acknowledgedSignature: string | null;
  receivedSignatureName: string | null;
  receivedSignature: string | null;
  status: InventoryLoanStatus;
  returnedAt: Date | null;
  returnedBy: string | null;
  returnNotes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryLoanCreationAttributes
  extends Optional<
    InventoryLoanAttributes,
    | 'id'
    | 'loanNumber'
    | 'loanDate'
    | 'notes'
    | 'submittedSignatureName'
    | 'submittedSignature'
    | 'acknowledgedSignatureName'
    | 'acknowledgedSignature'
    | 'receivedSignatureName'
    | 'receivedSignature'
    | 'status'
    | 'returnedAt'
    | 'returnedBy'
    | 'returnNotes'
    | 'createdAt'
    | 'updatedAt'
  > {}

class InventoryLoan
  extends Model<InventoryLoanAttributes, InventoryLoanCreationAttributes>
  implements InventoryLoanAttributes
{
  declare id: string;
  declare loanNumber: string;
  declare direction: InventoryLoanDirection;
  declare loanDate: Date;
  declare borrowerName: string;
  declare targetName: string;
  declare notes: string | null;
  declare submittedSignatureName: string | null;
  declare submittedSignature: string | null;
  declare acknowledgedSignatureName: string | null;
  declare acknowledgedSignature: string | null;
  declare receivedSignatureName: string | null;
  declare receivedSignature: string | null;
  declare status: InventoryLoanStatus;
  declare returnedAt: Date | null;
  declare returnedBy: string | null;
  declare returnNotes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

InventoryLoan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loanNumber: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'loan_number',
    },
    direction: {
      type: DataTypes.ENUM(...Object.values(InventoryLoanDirection)),
      allowNull: false,
    },
    loanDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'loan_date',
    },
    borrowerName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'borrower_name',
    },
    targetName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'target_name',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submittedSignatureName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'submitted_signature_name',
    },
    submittedSignature: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'submitted_signature',
    },
    acknowledgedSignatureName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'acknowledged_signature_name',
    },
    acknowledgedSignature: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'acknowledged_signature',
    },
    receivedSignatureName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'received_signature_name',
    },
    receivedSignature: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'received_signature',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InventoryLoanStatus)),
      allowNull: false,
      defaultValue: InventoryLoanStatus.BORROWED,
    },
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'returned_at',
    },
    returnedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'returned_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    returnNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'return_notes',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt',
    },
  },
  {
    sequelize,
    tableName: 'inventory_loans',
  }
);

export default InventoryLoan;
