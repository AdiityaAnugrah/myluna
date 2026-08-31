import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('platforms');
    if (!table.fee_percentage) {
      await queryInterface.addColumn('platforms', 'fee_percentage', {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 25,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('platforms');
    if (table.fee_percentage) {
      await queryInterface.removeColumn('platforms', 'fee_percentage');
    }
  },
};
