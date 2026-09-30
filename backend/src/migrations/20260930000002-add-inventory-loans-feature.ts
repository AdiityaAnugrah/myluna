import { randomUUID } from 'crypto';
import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('feature_flags')) return;

    await queryInterface.sequelize.query(
      `
        INSERT INTO feature_flags
          (id, \`key\`, label, description, path, isEnabled, isDevelopment, allowedRoles, sortOrder, createdAt, updatedAt)
        SELECT
          :id,
          'inventory-loans',
          'Pinjam Barang',
          'Form dan riwayat pinjaman barang antara stok kita dan pusat/TCP.',
          '/inventory-loans',
          1,
          0,
          :allowedRoles,
          45,
          NOW(),
          NOW()
        WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE \`key\` = 'inventory-loans')
      `,
      {
        replacements: {
          id: randomUUID(),
          allowedRoles: JSON.stringify(['ADMIN_ORDER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV']),
        },
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query("DELETE FROM feature_flags WHERE `key` = 'inventory-loans'");
  },
};
