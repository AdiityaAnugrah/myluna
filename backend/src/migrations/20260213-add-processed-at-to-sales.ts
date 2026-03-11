import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable('sales');
    if (!tableInfo.processed_at) {
      await queryInterface.addColumn('sales', 'processed_at', {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('sales', 'processed_at');
  },
};
