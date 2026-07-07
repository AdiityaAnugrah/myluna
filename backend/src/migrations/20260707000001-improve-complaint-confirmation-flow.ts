import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'complaints';
const COLUMN_NAME = 'status';

const currentStatuses = [
  'PENDING_TCP_REVIEW',
  'REJECTED_BY_TCP',
  'ACCEPTED_BY_TCP',
  'REPLACEMENT_SHIPPED',
  'WAITING_USER_CONFIRMATION',
  'FOLLOW_UP_REQUIRED',
  'COMPLETED',
  'CONVERTED_TO_RETURN',
];

const previousStatuses = [
  'PENDING_TCP_REVIEW',
  'REJECTED_BY_TCP',
  'ACCEPTED_BY_TCP',
  'REPLACEMENT_SHIPPED',
  'COMPLETED',
  'CONVERTED_TO_RETURN',
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (!table[COLUMN_NAME]) return;

    await queryInterface.changeColumn(TABLE_NAME, COLUMN_NAME, {
      type: DataTypes.ENUM(...currentStatuses),
      allowNull: false,
      defaultValue: 'PENDING_TCP_REVIEW',
    });

    const updatedTable = await queryInterface.describeTable(TABLE_NAME);

    if (!updatedTable.followUpReason) {
      await queryInterface.addColumn(TABLE_NAME, 'followUpReason', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!updatedTable.followUpRequestedAt) {
      await queryInterface.addColumn(TABLE_NAME, 'followUpRequestedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }

    if (!updatedTable.completedBy) {
      await queryInterface.addColumn(TABLE_NAME, 'completedBy', {
        type: DataTypes.UUID,
        allowNull: true,
      });
    }

    if (!updatedTable.completedAt) {
      await queryInterface.addColumn(TABLE_NAME, 'completedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (!table[COLUMN_NAME]) return;

    await queryInterface.sequelize.query(
      `UPDATE ${TABLE_NAME}
       SET ${COLUMN_NAME} = 'REPLACEMENT_SHIPPED'
       WHERE ${COLUMN_NAME} IN ('WAITING_USER_CONFIRMATION', 'FOLLOW_UP_REQUIRED')`
    );

    await queryInterface.changeColumn(TABLE_NAME, COLUMN_NAME, {
      type: DataTypes.ENUM(...previousStatuses),
      allowNull: false,
      defaultValue: 'PENDING_TCP_REVIEW',
    });

    const updatedTable = await queryInterface.describeTable(TABLE_NAME);

    if (updatedTable.completedAt) {
      await queryInterface.removeColumn(TABLE_NAME, 'completedAt');
    }
    if (updatedTable.completedBy) {
      await queryInterface.removeColumn(TABLE_NAME, 'completedBy');
    }
    if (updatedTable.followUpRequestedAt) {
      await queryInterface.removeColumn(TABLE_NAME, 'followUpRequestedAt');
    }
    if (updatedTable.followUpReason) {
      await queryInterface.removeColumn(TABLE_NAME, 'followUpReason');
    }
  },
};
