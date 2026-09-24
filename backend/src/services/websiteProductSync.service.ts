import { Op } from 'sequelize';
import { Product, ProductVariant, Category } from '../models';
import { parseBoolean, postJsonToLunareaWebsite } from './lunareaWebsiteHttp.service';

type SyncTimer = ReturnType<typeof setTimeout>;

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
}

function cleanSlug(value: unknown, fallback: string) {
  const raw = cleanText(value || fallback).toLowerCase();
  return raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function syncEnabled() {
  return String(process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_ENABLED || '').toLowerCase() === 'true';
}

function getSyncUrl() {
  return String(
    process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_URL ||
    'https://lunareafurniture.com/integrations/luna-product-sync'
  );
}

function getSyncHostHeader() {
  return cleanText(process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_HOST);
}

async function buildWebsiteProductPayload(product: Product) {
  const json: any = product.toJSON();
  const category = json.category || null;
  const parentCategory = category?.parent || null;
  const variantItems = Array.isArray(json.variantItems) ? json.variantItems : [];
  const marketplaceLinks = json.marketplaceLinks || {};

  return {
    id: product.id,
    sku: product.sku,
    website_id: marketplaceLinks.websiteId || marketplaceLinks.website_id || product.sku,
    name: product.name,
    slug: product.slug || cleanSlug(product.slug, product.name),
    description: product.description || '',
    category: parentCategory?.name || category?.name || '',
    subCategory: parentCategory?.name ? category?.name || '' : '',
    sellingPrice: numberValue(product.sellingPrice),
    purchasePrice: numberValue(product.purchasePrice),
    warrantyPrice: product.warrantyPrice === null || product.warrantyPrice === undefined ? null : numberValue(product.warrantyPrice),
    stock: numberValue(product.stock),
    minStock: numberValue(product.minStock),
    unit: product.unit,
    length: product.length === null || product.length === undefined ? null : numberValue(product.length),
    width: product.width === null || product.width === undefined ? null : numberValue(product.width),
    height: product.height === null || product.height === undefined ? null : numberValue(product.height),
    weight: product.weight === null || product.weight === undefined ? null : numberValue(product.weight),
    isActive: product.isActive,
    variants: variantItems.map((variant: any) => ({
      id: variant.id,
      name: cleanText(variant.name || variant.value),
      value: cleanText(variant.value || variant.name),
      priceAdjustment: numberValue(variant.priceAdjustment),
      stock: numberValue(variant.stock),
    })),
    marketplaceLinks,
    shopee: marketplaceLinks.shopee || '',
    tokped: marketplaceLinks.tokped || '',
    tiktok: marketplaceLinks.tiktok || '',
    youtube: marketplaceLinks.youtube || '',
    updatedAt: product.updatedAt,
  };
}

class WebsiteProductSyncService {
  private timers = new Map<string, SyncTimer>();

  queueProductSync(productId: string, delayMs = 1500) {
    if (!productId || !syncEnabled()) return;

    const currentTimer = this.timers.get(productId);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const timer = setTimeout(() => {
      this.timers.delete(productId);
      this.syncProduct(productId).catch((error) => {
        console.error('Gagal sync produk ke website Lunarea', {
          productId,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }, delayMs);

    this.timers.set(productId, timer);
  }

  async syncProduct(productId: string) {
    if (!syncEnabled()) {
      return { skipped: true, reason: 'disabled' };
    }

    const token = String(process.env.LUNA_WEB_ORDER_TOKEN || '');
    if (!token) {
      return { skipped: true, reason: 'missing_token' };
    }

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: ProductVariant,
          as: 'variantItems',
          separate: true,
          order: [['createdAt', 'ASC']],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'parentId'],
          include: [
            {
              model: Category,
              as: 'parent',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    if (!product) {
      return { skipped: true, reason: 'product_not_found' };
    }

    const response = await postJsonToLunareaWebsite(getSyncUrl(), {
        source: 'luna-system-auto',
        create_missing: false,
        products: [await buildWebsiteProductPayload(product)],
      },
      {
        token,
        hostHeader: getSyncHostHeader() || undefined,
        insecureTls: parseBoolean(process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_INSECURE_TLS),
      }
    );

    let responseJson: any = null;
    try {
      responseJson = JSON.parse(response.text);
    } catch (_) {
      responseJson = null;
    }

    if (!response.ok) {
      throw new Error(`Website response ${response.status}: ${response.text.slice(0, 500)}`);
    }

    return responseJson || { success: true };
  }

  async syncMany(productIds: string[]) {
    const ids = [...new Set(productIds.filter(Boolean))];
    if (!ids.length) return { sent: 0 };

    const products = await Product.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        {
          model: ProductVariant,
          as: 'variantItems',
          separate: true,
          order: [['createdAt', 'ASC']],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'parentId'],
          include: [{ model: Category, as: 'parent', attributes: ['id', 'name'] }],
        },
      ],
    });

    const token = String(process.env.LUNA_WEB_ORDER_TOKEN || '');
    const response = await postJsonToLunareaWebsite(getSyncUrl(), {
        source: 'luna-system-auto-batch',
        create_missing: false,
        products: await Promise.all(products.map(buildWebsiteProductPayload)),
      },
      {
        token,
        hostHeader: getSyncHostHeader() || undefined,
        insecureTls: parseBoolean(process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_INSECURE_TLS),
      }
    );

    let responseJson: any = null;
    try {
      responseJson = JSON.parse(response.text);
    } catch (_) {
      responseJson = null;
    }

    if (!response.ok) {
      throw new Error(`Website response ${response.status}: ${response.text.slice(0, 500)}`);
    }

    return responseJson || { success: true };
  }
}

export const websiteProductSyncService = new WebsiteProductSyncService();
export { buildWebsiteProductPayload };
