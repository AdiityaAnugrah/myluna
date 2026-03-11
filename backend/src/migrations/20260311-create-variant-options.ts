import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('variant_options')) return;

    await queryInterface.createTable('variant_options', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
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

    const VARIANT_COLOR_OPTIONS = [
      'PUTIH', 'WALNUT', 'WINGE', 'MARBLE', 'BIRU', 'PINK', 'SONOMA', 'CHERRY',
      'MARBLE WINGE', 'PUTIH WINGE', 'JATI', 'NANO', 'MARBLE BESI HITAM',
      'WINGE BESI PUTIH', 'PUTIH BESI HITAM', 'SONOMA BESI PUTIH', 'HITAM',
      'ABU ABU', 'HIJAU', 'MERAH', 'MAHONI', 'PUTIH MAHONI', 'WINGE PUTIH', 
      'CHERRY PUTIH', 'ORANGE', 'PUTIH ORANGE', 'PUTIH PINK', 'PUTIH HITAM', 
      'PUTIH BIRU', 'CHERRY HITAM', 'SONOMA HITAM', 'SONOMA PUTIH', 'DIRECTPINE', 'JATI HITAM'
    ];

    const now = new Date();
    const crypto = await import('crypto');
    const options = VARIANT_COLOR_OPTIONS.map(name => ({
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('variant_options', options);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('variant_options');
  },
};
