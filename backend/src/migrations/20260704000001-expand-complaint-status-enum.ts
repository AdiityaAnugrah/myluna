import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'complaints';
const COLUMN_NAME = 'status';

const currentStatuses = [
  'PENDING_TCP_REVIEW',
  'REJECTED_BY_TCP',
  'ACCEPTED_BY_TCP',
  'REPLACEMENT_SHIPPED',
  'COMPLETED',
  'CONVERTED_TO_RETURN',
];

const previousStatuses = [
  'PENDING_TCP_REVIEW',
  'REJECTED_BY_TCP',
  'ACCEPTED_BY_TCP',
  'REPLACEMENT_SHIPPED',
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
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (!table[COLUMN_NAME]) return;

    await queryInterface.sequelize.query(
      `UPDATE ${TABLE_NAME}
       SET ${COLUMN_NAME} = 'REPLACEMENT_SHIPPED'
       WHERE ${COLUMN_NAME} IN ('COMPLETED', 'CONVERTED_TO_RETURN')`
    );

    await queryInterface.changeColumn(TABLE_NAME, COLUMN_NAME, {
      type: DataTypes.ENUM(...previousStatuses),
      allowNull: false,
      defaultValue: 'PENDING_TCP_REVIEW',
    });
  },
};
