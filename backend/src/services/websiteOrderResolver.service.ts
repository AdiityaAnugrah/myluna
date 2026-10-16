import { Op } from 'sequelize';
import { Sale } from '../models';
import { AppError } from '../utils/errors';
import { websiteExternalOrderId, websiteInternalSaleNumber } from '../utils/websiteOrderReference';

export async function resolveWebsiteOrder(orderId: string, transaction: any, include?: any[]): Promise<Sale | null> {
  const internal = websiteInternalSaleNumber(orderId);
  const candidates = await Sale.findAll({ where: { saleNumber: { [Op.in]: [internal, orderId] } },
    ...(include ? { include } : {}), transaction, lock: transaction.LOCK.UPDATE });
  const namespaced = candidates.find(s => s.saleNumber === internal);
  const legacy = candidates.find(s => s.saleNumber === orderId);
  if (namespaced) {
    if (websiteExternalOrderId(namespaced) !== orderId) throw new AppError('Referensi pesanan internal bertentangan', 409);
    if (legacy && legacy.id !== namespaced.id && String(legacy.platform) === 'WEBSITE') throw new AppError('Dua transaksi website memakai referensi yang sama; perlu rekonsiliasi', 409);
    return namespaced;
  }
  if (legacy) {
    if (String(legacy.platform) !== 'WEBSITE') throw new AppError('Nomor website bertabrakan dengan transaksi manual. Tinjau pencatatan admin; pesanan tidak dibuat ulang.', 409);
    if (websiteExternalOrderId(legacy) !== orderId) throw new AppError('Referensi pesanan lama bertentangan', 409);
    return legacy;
  }
  return null;
}
