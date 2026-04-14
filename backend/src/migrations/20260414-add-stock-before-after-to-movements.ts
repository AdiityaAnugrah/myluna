import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable('stock_movements');
    if (!tableInfo.stock_before) {
      await queryInterface.addColumn('stock_movements', 'stock_before', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!tableInfo.stock_after) {
      await queryInterface.addColumn('stock_movements', 'stock_after', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('stock_movements', 'stock_before');
    await queryInterface.removeColumn('stock_movements', 'stock_after');
  },
};
