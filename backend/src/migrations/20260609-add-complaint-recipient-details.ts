import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('complaints');

    if (!table.recipientName) {
      await queryInterface.addColumn('complaints', 'recipientName', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
    }

    if (!table.recipientPhone) {
      await queryInterface.addColumn('complaints', 'recipientPhone', {
        type: DataTypes.STRING(30),
        allowNull: true,
      });
    }

    if (!table.recipientAddress) {
      await queryInterface.addColumn('complaints', 'recipientAddress', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!table.recipientAddressNote) {
      await queryInterface.addColumn('complaints', 'recipientAddressNote', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('complaints');

    if (table.recipientAddressNote) {
      await queryInterface.removeColumn('complaints', 'recipientAddressNote');
    }

    if (table.recipientAddress) {
      await queryInterface.removeColumn('complaints', 'recipientAddress');
    }

    if (table.recipientPhone) {
      await queryInterface.removeColumn('complaints', 'recipientPhone');
    }

    if (table.recipientName) {
      await queryInterface.removeColumn('complaints', 'recipientName');
    }
  },
};
