import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (!(await tableExists(queryInterface, 'return_ticket_participants'))) return;

    const table = await queryInterface.describeTable('return_ticket_participants');
    if (!table.lastReadAt) {
      await queryInterface.addColumn('return_ticket_participants', 'lastReadAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      await queryInterface.addIndex('return_ticket_participants', ['lastReadAt']);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (!(await tableExists(queryInterface, 'return_ticket_participants'))) return;

    const table = await queryInterface.describeTable('return_ticket_participants');
    if (table.lastReadAt) {
      await queryInterface.removeIndex('return_ticket_participants', ['lastReadAt']);
      await queryInterface.removeColumn('return_ticket_participants', 'lastReadAt');
    }
  },
};
