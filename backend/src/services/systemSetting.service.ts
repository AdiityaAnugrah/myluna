import { SystemSetting } from '../models';

export const SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY = 'settlementConfirmationDateBasis';

export type SettlementConfirmationDateBasis = 'SETTLEMENT_DATE' | 'CONFIRMATION_DATE';

const DEFAULT_VALUES: Record<string, string> = {
  [SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY]: 'SETTLEMENT_DATE',
};

export async function getSystemSettingValue(key: string) {
  const setting = await SystemSetting.findOne({ where: { key } });
  return setting?.value || DEFAULT_VALUES[key] || '';
}

export async function getSettlementConfirmationDateBasis(): Promise<SettlementConfirmationDateBasis> {
  const value = await getSystemSettingValue(SETTLEMENT_CONFIRMATION_DATE_BASIS_KEY);
  return value === 'CONFIRMATION_DATE' ? 'CONFIRMATION_DATE' : 'SETTLEMENT_DATE';
}
