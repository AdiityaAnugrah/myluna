import { randomUUID } from 'crypto';
import { QueryInterface } from 'sequelize';

const now = () => new Date();

const featureSeeds = [
  {
    key: 'finance-sales-book',
    label: 'Buku Penjualan',
    description: 'Preview buku penjualan read-only untuk validasi gross, pelunasan, dan saldo piutang.',
    path: '/finance/sales-book',
    sortOrder: 16,
  },
  {
    key: 'finance-cost-book',
    label: 'Buku Biaya',
    description: 'Preview buku biaya read-only untuk validasi dana bersih, biaya/potongan, dan saldo piutang.',
    path: '/finance/cost-book',
    sortOrder: 17,
  },
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.map(String).includes('feature_flags')) return;

    const createdAt = now();
    const updatedAt = now();

    for (const feature of featureSeeds) {
      await queryInterface.sequelize.query(
        `
          INSERT INTO feature_flags
            (id, \`key\`, label, description, path, isEnabled, isDevelopment, allowedRoles, sortOrder, createdAt, updatedAt)
          SELECT :id, :key, :label, :description, :path, 0, 1, :allowedRoles, :sortOrder, :createdAt, :updatedAt
          WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE \`key\` = :key)
        `,
        {
          replacements: {
            id: randomUUID(),
            key: feature.key,
            label: feature.label,
            description: feature.description,
            path: feature.path,
            allowedRoles: JSON.stringify(['ADMIN', 'SUPER_ADMIN', 'DEV']),
            sortOrder: feature.sortOrder,
            createdAt,
            updatedAt,
          },
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.map(String).includes('feature_flags')) return;

    await queryInterface.sequelize.query(
      "DELETE FROM feature_flags WHERE `key` IN ('finance-sales-book', 'finance-cost-book')"
    );
  },
};
