import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'complaints';
const STATUS_COLUMN = 'status';

const currentStatuses = [
  'PENDING_TCP_REVIEW',
  'REJECTED_BY_TCP',
  'ACCEPTED_BY_TCP',
  'REPLACEMENT_SHIPPED',
  'WAITING_USER_CONFIRMATION',
  'WAITING_USER_DELIVERY_CONFIRMATION',
  'MONITORING_CUSTOMER_CONFIRMATION',
  'FOLLOW_UP_REQUIRED',
  'COMPLETED',
  'CONVERTED_TO_RETURN',
];

const previousStatuses = [
  'PENDING_TCP_REVIEW',
  'REJECTED_BY_TCP',
  'ACCEPTED_BY_TCP',
  'REPLACEMENT_SHIPPED',
  'WAITING_USER_CONFIRMATION',
  'FOLLOW_UP_REQUIRED',
  'COMPLETED',
  'CONVERTED_TO_RETURN',
];

async function hasColumn(queryInterface: QueryInterface, columnName: string) {
  const table = await queryInterface.describeTable(TABLE_NAME);
  return Object.prototype.hasOwnProperty.call(table, columnName);
}

async function addColumnIfMissing(
  queryInterface: QueryInterface,
  columnName: string,
  attributes: Parameters<QueryInterface['addColumn']>[2]
) {
  if (!(await hasColumn(queryInterface, columnName))) {
    await queryInterface.addColumn(TABLE_NAME, columnName, attributes);
  }
}

async function removeColumnIfExists(queryInterface: QueryInterface, columnName: string) {
  if (await hasColumn(queryInterface, columnName)) {
    await queryInterface.removeColumn(TABLE_NAME, columnName);
  }
}

async function addIndexIfMissing(queryInterface: QueryInterface, fields: string[], name: string) {
  const indexes = (await queryInterface.showIndex(TABLE_NAME)) as any[];
  if (!indexes.some((index) => index.name === name)) {
    await queryInterface.addIndex(TABLE_NAME, fields, { name });
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (table[STATUS_COLUMN]) {
      await queryInterface.changeColumn(TABLE_NAME, STATUS_COLUMN, {
        type: DataTypes.ENUM(...currentStatuses),
        allowNull: false,
        defaultValue: 'PENDING_TCP_REVIEW',
      });
    }

    await addColumnIfMissing(queryInterface, 'complaintType', {
      type: DataTypes.STRING(30),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'tcpDeadlineAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'deliveryConfirmDeadlineAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'deliveredConfirmedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'customerCheckDeadlineAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'caseClosedByUserAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await addIndexIfMissing(queryInterface, ['complaintType'], 'idx_complaints_complaint_type');
    await addIndexIfMissing(queryInterface, ['tcpDeadlineAt'], 'idx_complaints_tcp_deadline_at');
    await addIndexIfMissing(queryInterface, ['deliveryConfirmDeadlineAt'], 'idx_complaints_delivery_confirm_deadline_at');
    await addIndexIfMissing(queryInterface, ['customerCheckDeadlineAt'], 'idx_complaints_customer_check_deadline_at');
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (table[STATUS_COLUMN]) {
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE_NAME}
         SET ${STATUS_COLUMN} = 'WAITING_USER_CONFIRMATION'
         WHERE ${STATUS_COLUMN} IN ('WAITING_USER_DELIVERY_CONFIRMATION', 'MONITORING_CUSTOMER_CONFIRMATION')`
      );

      await queryInterface.changeColumn(TABLE_NAME, STATUS_COLUMN, {
        type: DataTypes.ENUM(...previousStatuses),
        allowNull: false,
        defaultValue: 'PENDING_TCP_REVIEW',
      });
    }

    for (const column of [
      'caseClosedByUserAt',
      'customerCheckDeadlineAt',
      'deliveredConfirmedAt',
      'deliveryConfirmDeadlineAt',
      'tcpDeadlineAt',
      'complaintType',
    ]) {
      await removeColumnIfExists(queryInterface, column);
    }
  },
};
