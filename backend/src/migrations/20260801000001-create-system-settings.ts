import { randomUUID } from 'crypto';
import { DataTypes, QueryInterface } from 'sequelize';

const SETTLEMENT_DATE_BASIS_KEY = 'settlementConfirmationDateBasis';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('system_settings')) {
      await queryInterface.createTable('system_settings', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        key: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        value: {
          type: DataTypes.STRING(160),
          allowNull: false,
        },
        label: {
          type: DataTypes.STRING(160),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
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

    await queryInterface.sequelize.query(
      `
        INSERT INTO system_settings
          (id, \`key\`, value, label, description, createdAt, updatedAt)
        SELECT
          :id,
          :key,
          'SETTLEMENT_DATE',
          'Basis Tanggal Konfirmasi Pelunasan',
          'Menentukan tanggal resmi yang dipakai saat admin mengonfirmasi pengajuan pelunasan USER.',
          NOW(),
          NOW()
        WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE \`key\` = :key)
      `,
      {
        replacements: {
          id: randomUUID(),
          key: SETTLEMENT_DATE_BASIS_KEY,
        },
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('system_settings')) {
      await queryInterface.sequelize.query('DELETE FROM system_settings WHERE `key` = :key', {
        replacements: { key: SETTLEMENT_DATE_BASIS_KEY },
      });
    }
  },
};
