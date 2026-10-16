import { Op } from 'sequelize';
import { Sale } from '../models';
import { sequelize } from '../config/database';
import { postJsonToLunareaWebsite } from './lunareaWebsiteHttp.service';
import { websiteExternalOrderId } from '../utils/websiteOrderReference';

type FulfillmentSale = { id: string; saleNumber: string; platform: unknown; processedAt: Date | null; notes?: string | null };
const ACK = '[Lunarea Process Acknowledged]';
const processTime = (value: Date) => new Date(Math.floor(new Date(value).getTime() / 1000) * 1000).toISOString();

export function websiteFulfillment(sale: FulfillmentSale) {
  return {
    order_id: websiteExternalOrderId(sale), sale_id: sale.id,
    stage: sale.processedAt ? 'processed' : 'received',
    processed_at: sale.processedAt ? processTime(sale.processedAt) : null,
  };
}

/** Called after commit only. Failure never rolls back TCP work; the bounded retry worker retries it. */
export async function notifyWebsiteProcessed(sale: FulfillmentSale): Promise<boolean> {
  if (String(sale.platform) !== 'WEBSITE' || !sale.processedAt || !/^L[A-Za-z0-9_-]{1,49}$/.test(sale.saleNumber)) return false;
  const token = process.env.LUNA_WEB_ORDER_TOKEN || '';
  if (!token) return false;
  const configured = process.env.LUNA_WEB_ORDER_STATUS_URL;
  const returnUrl = process.env.LUNA_WEB_RETURN_STATUS_URL || '';
  const url = configured || (returnUrl.endsWith('/integrations/luna-return-status')
    ? returnUrl.replace(/luna-return-status$/, 'luna-order-status')
    : 'https://lunareafurniture.com/integrations/luna-order-status');
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.username || target.password) throw new Error('Invalid callback URL');
    const event = websiteFulfillment(sale);
    const response = await postJsonToLunareaWebsite(url, event, { token, timeoutMs: 8000 });
    const body = JSON.parse(response.text);
    if (!response.ok || body.success !== true || body.order_id !== event.order_id || body.stage !== 'processed') throw new Error('Callback not acknowledged');
    // Lock and re-read notes so concurrent AWB edits are never overwritten by an old snapshot.
    await sequelize.transaction(async transaction => {
      const current = await Sale.findByPk(sale.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!current || current.saleNumber !== sale.saleNumber || !current.processedAt
        || processTime(current.processedAt) !== event.processed_at) return;
      if (!(current.notes || '').includes(ACK)) await current.update({ notes: [current.notes, ACK].filter(Boolean).join('\n\n') }, { transaction });
    });
    return true;
  } catch {
    console.warn('Konfirmasi proses website belum diterima; akan dicoba ulang', { orderId: sale.saleNumber });
    return false;
  }
}

let running = false;
let cursor = '';
export async function retryWebsiteProcessed(): Promise<void> {
  if (running || !process.env.LUNA_WEB_ORDER_TOKEN) return;
  running = true;
  try {
    const rows = await Sale.findAll({ where: {
      platform: 'WEBSITE' as any, status: { [Op.in]: ['PROCESSED', 'SETTLED', 'COMPLETED'] },
      processedAt: { [Op.ne]: null }, id: { [Op.gt]: cursor },
      [Op.or]: [{ notes: { [Op.notLike]: `%${ACK}%` } }, { notes: null }],
    }, order: [['id', 'ASC']], limit: 25 });
    for (const sale of rows) {
      cursor = sale.id;
      await notifyWebsiteProcessed(sale);
    }
    if (rows.length < 25) cursor = '';
  } catch {
    console.warn('Pemeriksaan ulang konfirmasi proses website tertunda');
  } finally { running = false; }
}
