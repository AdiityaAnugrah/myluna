import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('display_products')) return;

    await queryInterface.sequelize.query(`
      UPDATE display_products
      SET stock = 0,
          slotLimit = 1,
          status = 'STORED',
          updatedAt = NOW()
      WHERE isActive = 1
    `);
  },

  down: async () => {
    // Tidak dikembalikan otomatis supaya hasil offname/pengajuan user tidak tertimpa.
  },
};
