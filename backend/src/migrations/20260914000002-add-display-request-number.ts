import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('display_stock_requests')) return;
    const columns = await queryInterface.describeTable('display_stock_requests');
    if (!columns.requestNumber) {
      await queryInterface.addColumn('display_stock_requests', 'requestNumber', { type: DataTypes.STRING(50), allowNull: true });
      await queryInterface.addIndex('display_stock_requests', ['requestNumber']);
    }
  },
  async down(queryInterface: QueryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('display_stock_requests')) return;
    const columns = await queryInterface.describeTable('display_stock_requests');
    if (columns.requestNumber) await queryInterface.removeColumn('display_stock_requests', 'requestNumber');
  },
};
