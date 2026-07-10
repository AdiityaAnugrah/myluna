import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
}

async function getTableDefinition(queryInterface: QueryInterface, tableName: string) {
  if (!(await tableExists(queryInterface, tableName))) return null;
  return queryInterface.describeTable(tableName);
}

async function columnExists(queryInterface: QueryInterface, tableName: string, columnName: string) {
  const table = await getTableDefinition(queryInterface, tableName);
  return !!table && Object.prototype.hasOwnProperty.call(table, columnName);
}

async function addColumnIfMissing(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  attributes: Parameters<QueryInterface['addColumn']>[2]
) {
  if (!(await columnExists(queryInterface, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, attributes);
  }
}

async function removeColumnIfExists(queryInterface: QueryInterface, tableName: string, columnName: string) {
  if (await columnExists(queryInterface, tableName, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

async function addIndexIfMissing(queryInterface: QueryInterface, tableName: string, fields: string[], name: string) {
  if (!(await tableExists(queryInterface, tableName))) return;
  const indexes = (await queryInterface.showIndex(tableName)) as any[];
  const exists = indexes.some((index) => index.name === name);
  if (!exists) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'complaints')) {
      await addColumnIfMissing(queryInterface, 'complaints', 'resolutionType', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'resolutionStatus', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'settlementId', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'linkedReturnId', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'deductionAmount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'netReceivedAmount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'deductionReason', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'componentShipmentStatus', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'componentShippingService', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'componentShippingCost', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'resolutionNotes', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'resolvedBy', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'complaints', 'resolvedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });

      await addIndexIfMissing(queryInterface, 'complaints', ['resolutionType'], 'idx_complaints_resolution_type');
      await addIndexIfMissing(queryInterface, 'complaints', ['resolutionStatus'], 'idx_complaints_resolution_status');
      await addIndexIfMissing(queryInterface, 'complaints', ['linkedReturnId'], 'idx_complaints_linked_return_id');
    }

    if (await tableExists(queryInterface, 'sale_returns')) {
      await addColumnIfMissing(queryInterface, 'sale_returns', 'sourceType', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'sourceComplaintId', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'inspectionResult', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'finalOutcome', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'lossAmount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'incomeLostAmount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'repairCost', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'repairNotes', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'finalOutcomeNotes', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'inspectedBy', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'inspectedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'finalizedBy', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_returns', 'finalizedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });

      await addIndexIfMissing(queryInterface, 'sale_returns', ['sourceType'], 'idx_sale_returns_source_type');
      await addIndexIfMissing(queryInterface, 'sale_returns', ['sourceComplaintId'], 'idx_sale_returns_source_complaint_id');
      await addIndexIfMissing(queryInterface, 'sale_returns', ['inspectionResult'], 'idx_sale_returns_inspection_result');
      await addIndexIfMissing(queryInterface, 'sale_returns', ['finalOutcome'], 'idx_sale_returns_final_outcome');
    }

    if (await tableExists(queryInterface, 'sale_return_items')) {
      await addColumnIfMissing(queryInterface, 'sale_return_items', 'inspectionResult', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_return_items', 'finalOutcome', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_return_items', 'qtyWrittenOff', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_return_items', 'qtyRepaired', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_return_items', 'qtyRestocked', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'sale_return_items', 'itemNotes', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (await tableExists(queryInterface, 'settlements')) {
      await addColumnIfMissing(queryInterface, 'settlements', 'complaint_id', {
        type: DataTypes.UUID,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'settlements', 'deduction_amount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'settlements', 'deduction_reason', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'settlements', 'gross_amount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, 'settlements', 'deduction_type', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });

      await addIndexIfMissing(queryInterface, 'settlements', ['complaint_id'], 'idx_settlements_complaint_id');
      await addIndexIfMissing(queryInterface, 'settlements', ['deduction_type'], 'idx_settlements_deduction_type');
    }

    if (!(await tableExists(queryInterface, 'complaint_component_shipments'))) {
      await queryInterface.createTable('complaint_component_shipments', {
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
      });

      await queryInterface.addIndex('complaint_component_shipments', ['complaintId'], {
        name: 'idx_complaint_component_shipments_complaint_id',
      });
      await queryInterface.addIndex('complaint_component_shipments', ['productId'], {
        name: 'idx_complaint_component_shipments_product_id',
      });
      await queryInterface.addIndex('complaint_component_shipments', ['stockMovementId'], {
        name: 'idx_complaint_component_shipments_stock_movement_id',
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'complaint_component_shipments')) {
      await queryInterface.dropTable('complaint_component_shipments');
    }

    for (const column of [
      'complaint_id',
      'deduction_amount',
      'deduction_reason',
      'gross_amount',
      'deduction_type',
    ]) {
      await removeColumnIfExists(queryInterface, 'settlements', column);
    }

    for (const column of [
      'inspectionResult',
      'finalOutcome',
      'qtyWrittenOff',
      'qtyRepaired',
      'qtyRestocked',
      'itemNotes',
    ]) {
      await removeColumnIfExists(queryInterface, 'sale_return_items', column);
    }

    for (const column of [
      'sourceType',
      'sourceComplaintId',
      'inspectionResult',
      'finalOutcome',
      'lossAmount',
      'incomeLostAmount',
      'repairCost',
      'repairNotes',
      'finalOutcomeNotes',
      'inspectedBy',
      'inspectedAt',
      'finalizedBy',
      'finalizedAt',
    ]) {
      await removeColumnIfExists(queryInterface, 'sale_returns', column);
    }

    for (const column of [
      'resolutionType',
      'resolutionStatus',
      'settlementId',
      'linkedReturnId',
      'deductionAmount',
      'netReceivedAmount',
      'deductionReason',
      'componentShipmentStatus',
      'componentShippingService',
      'componentShippingCost',
      'resolutionNotes',
      'resolvedBy',
      'resolvedAt',
    ]) {
      await removeColumnIfExists(queryInterface, 'complaints', column);
    }
  },
};
