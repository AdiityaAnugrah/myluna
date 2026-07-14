import { randomUUID } from 'crypto';
import { DataTypes, QueryInterface } from 'sequelize';

const now = () => new Date();

const featureSeeds = [
  {
    key: 'dashboard',
    label: 'Dasbor',
    description: 'Halaman ringkasan utama sistem.',
    path: '/',
    allowedRoles: ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'analytics',
    label: 'Analisa',
    description: 'Ringkasan analisa dan statistik sistem.',
    path: '/analytics',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'products',
    label: 'Data Master',
    description: 'Kelola data produk utama dan varian.',
    path: '/products',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'display',
    label: 'Sistem Display',
    description: 'Kelola slot display, pengajuan, retur, dan surat jalan display.',
    path: '/display',
    allowedRoles: ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'categories',
    label: 'Kategori',
    description: 'Kelola kategori produk.',
    path: '/categories',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'stock',
    label: 'Stok',
    description: 'Cek stok dan pengajuan penyesuaian stok.',
    path: '/stock',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'purchases',
    label: 'Pengajuan Stok',
    description: 'Buat dan pantau pengajuan stok masuk.',
    path: '/purchases',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'suppliers',
    label: 'Supplier',
    description: 'Kelola data supplier.',
    path: '/suppliers',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'sales',
    label: 'Penjualan',
    description: 'Buat dan kelola penjualan.',
    path: '/sales',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'sales-process',
    label: 'Proses Penjualan',
    description: 'Proses packing dan pengiriman penjualan.',
    path: '/sales/process',
    allowedRoles: ['TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'complaints',
    label: 'Komplen',
    description: 'Kelola komplen pelanggan dan tindak lanjutnya.',
    path: '/complaints',
    allowedRoles: ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'returns',
    label: 'Retur',
    description: 'Kelola retur penjualan dari proses komplen.',
    path: '/returns',
    allowedRoles: ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'financial-summary',
    label: 'Ringkasan Keuangan',
    description: 'Pantau ringkasan keuangan.',
    path: '/financial-summary',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'settlements',
    label: 'Pelunasan',
    description: 'Kelola pelunasan dan penyelesaian transaksi.',
    path: '/settlements',
    allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'finance-global-report',
    label: 'Laporan Global',
    description: 'Laporan global keuangan dan operasional.',
    path: '/finance/global-report',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'users',
    label: 'Pengguna',
    description: 'Kelola akun dan role pengguna.',
    path: '/users',
    allowedRoles: ['SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'platforms',
    label: 'Platform',
    description: 'Kelola platform penjualan.',
    path: '/platforms',
    allowedRoles: ['SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'shipping',
    label: 'Jasa Pengiriman',
    description: 'Kelola jasa pengiriman.',
    path: '/shipping',
    allowedRoles: ['SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'approvals',
    label: 'Persetujuan',
    description: 'Review pengajuan perubahan data.',
    path: '/approvals',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'settings',
    label: 'Pengaturan',
    description: 'Pengaturan akun dan sistem.',
    path: '/settings',
    allowedRoles: ['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'activities',
    label: 'Riwayat Aktivitas',
    description: 'Audit aktivitas pengguna.',
    path: '/activities',
    allowedRoles: ['SUPER_ADMIN', 'DEV'],
  },
  {
    key: 'dev-feature-control',
    label: 'Dev Control',
    description: 'Kontrol aktif/nonaktif fitur, akses role, dan status pengembangan.',
    path: '/dev/features',
    allowedRoles: ['DEV'],
  },
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    await queryInterface.sequelize.query(`
      INSERT INTO roles (id, name, description, createdAt, updatedAt)
      SELECT UUID(), 'DEV', 'Developer: akses tertinggi untuk mengatur fitur dan role.', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'DEV')
    `);

    if (!tables.includes('feature_flags')) {
      await queryInterface.createTable('feature_flags', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        key: {
          type: DataTypes.STRING(80),
          allowNull: false,
          unique: true,
        },
        label: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        path: {
          type: DataTypes.STRING(160),
          allowNull: true,
        },
        isEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        isDevelopment: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        allowedRoles: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
    }

    const createdAt = now();
    const updatedAt = now();

    for (let index = 0; index < featureSeeds.length; index += 1) {
      const feature = featureSeeds[index];
      await queryInterface.sequelize.query(
        `
          INSERT INTO feature_flags
            (id, \`key\`, label, description, path, isEnabled, isDevelopment, allowedRoles, sortOrder, createdAt, updatedAt)
          SELECT :id, :key, :label, :description, :path, 1, 0, :allowedRoles, :sortOrder, :createdAt, :updatedAt
          WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE \`key\` = :key)
        `,
        {
          replacements: {
            id: randomUUID(),
            key: feature.key,
            label: feature.label,
            description: feature.description,
            path: feature.path,
            allowedRoles: JSON.stringify(feature.allowedRoles),
            sortOrder: index + 1,
            createdAt,
            updatedAt,
          },
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('feature_flags')) {
      await queryInterface.dropTable('feature_flags');
    }

    await queryInterface.sequelize.query("DELETE FROM roles WHERE name = 'DEV'");
  },
};
