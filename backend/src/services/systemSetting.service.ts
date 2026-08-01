import { sequelize } from '../config/database';
import { SystemSetting } from '../models';

export const SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY = 'settlementConfirmationDateBasis';

export type SettlementConfirmationDateBasis = 'SETTLEMENT_DATE' | 'CONFIRMATION_DATE';

const DEFAULT_VALUES: Record<string, string> = {
  [SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY]: 'SETTLEMENT_DATE',
};

export async function ensureSystemSettingsReady() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
      \`key\` VARCHAR(100) NOT NULL UNIQUE,
      value VARCHAR(160) NOT NULL,
      label VARCHAR(160) NOT NULL,
      description TEXT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    )
  `);

  await sequelize.query(`
    INSERT INTO system_settings
      (id, \`key\`, value, label, description, createdAt, updatedAt)
    SELECT
      UUID(),
      :key,
      'SETTLEMENT_DATE',
      'Basis Tanggal Konfirmasi Pelunasan',
      'Menentukan tanggal resmi yang dipakai saat admin mengonfirmasi pengajuan pelunasan USER.',
      NOW(),
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE \`key\` = :key)
  `, {
    replacements: { key: SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY },
  });
}

export async function getSystemSettingValue(key: string) {
  await ensureSystemSettingsReady();
  const setting = await SystemSetting.findOne({ where: { key } });
  return setting?.value || DEFAULT_VALUES[key] || '';
}

export async function getSettlementConfirmationDateBasis(): Promise<SettlementConfirmationDateBasis> {
  const value = await getSystemSettingValue(SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY);
  return value === 'CONFIRMATION_DATE' ? 'CONFIRMATION_DATE' : 'SETTLEMENT_DATE';
}
