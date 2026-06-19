import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { District, Province, Regency, Sale, Village } from '../models';

type RegionMatch = {
  provinceId: number | null;
  regencyId: number | null;
  districtId: number | null;
  villageId: number | null;
  postalCode: string | null;
  confidence: 'postal' | 'text' | 'none';
};

const provinceAliases: Record<string, string[]> = {
  ACEH: ['ACEH', 'NAD', 'NANGGROE ACEH DARUSSALAM'],
  'KEPULAUAN BANGKA BELITUNG': ['KEPULAUAN BANGKA BELITUNG', 'BANGKA BELITUNG'],
  'DAERAH KHUSUS IBUKOTA JAKARTA': ['DAERAH KHUSUS IBUKOTA JAKARTA', 'DKI JAKARTA', 'JAKARTA'],
  'DAERAH ISTIMEWA YOGYAKARTA': ['DAERAH ISTIMEWA YOGYAKARTA', 'DI YOGYAKARTA', 'DIY', 'YOGYAKARTA'],
  'NUSA TENGGARA BARAT': ['NUSA TENGGARA BARAT', 'NTB'],
  'NUSA TENGGARA TIMUR': ['NUSA TENGGARA TIMUR', 'NTT'],
  'KEPULAUAN RIAU': ['KEPULAUAN RIAU', 'KEPRI'],
  'JAWA BARAT': ['JAWA BARAT', 'WEST JAVA'],
  'JAWA TENGAH': ['JAWA TENGAH', 'CENTRAL JAVA'],
  'JAWA TIMUR': ['JAWA TIMUR', 'EAST JAVA'],
};

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\bKAB\.?(\s|$)/g, 'KABUPATEN ')
    .replace(/SULAWE\s+SI\s+SE\s+LATAN/g, 'SULAWESI SELATAN')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesLabel(address: string, label: string) {
  const normalizedLabel = normalize(label);
  return normalizedLabel.length >= 3 && ` ${address} `.includes(` ${normalizedLabel} `);
}

function aliasesForProvince(label: string) {
  const normalized = normalize(label);
  return provinceAliases[normalized] || [normalized];
}

function aliasesForRegency(label: string) {
  return [label, label.replace(/^(Kabupaten|Kota(?: Administrasi)?)\s+/i, '')];
}

function uniqueValue(values: number[]) {
  const unique = Array.from(new Set(values));
  return unique.length === 1 ? unique[0] : null;
}

function sameValue(left: number | null | undefined, right: number | null) {
  return (left ?? null) === right;
}

async function main() {
  const applyChanges = process.argv.includes('--apply');

  const [sales, provinces, regencies, districts, villages] = await Promise.all([
    Sale.findAll({
      where: {
        shippingAddress: { [Op.ne]: null },
        isInitialBalance: false,
      },
      attributes: [
        'id',
        'saleNumber',
        'shippingAddress',
        'shippingPostalCode',
        'shippingProvinceId',
        'shippingRegencyId',
        'shippingDistrictId',
        'shippingVillageId',
      ],
      order: [['saleDate', 'ASC']],
    }),
    Province.findAll({ where: { isActive: true }, order: [['label', 'ASC']] }),
    Regency.findAll({ where: { isActive: true }, order: [['label', 'ASC']] }),
    District.findAll({ where: { isActive: true }, order: [['label', 'ASC']] }),
    Village.findAll({ where: { isActive: true }, order: [['label', 'ASC']] }),
  ]);

  const provinceById = new Map(provinces.map((item) => [item.id, item]));
  const regencyById = new Map(regencies.map((item) => [item.id, item]));
  const districtById = new Map(districts.map((item) => [item.id, item]));
  const regenciesByProvince = new Map<number, Regency[]>();
  const districtsByProvince = new Map<number, District[]>();
  const villagesByPostalCode = new Map<string, Village[]>();

  for (const regency of regencies) {
    regenciesByProvince.set(regency.provinceId, [
      ...(regenciesByProvince.get(regency.provinceId) || []),
      regency,
    ]);
  }
  for (const district of districts) {
    districtsByProvince.set(district.provinceId, [
      ...(districtsByProvince.get(district.provinceId) || []),
      district,
    ]);
  }
  for (const village of villages) {
    if (!village.postalCode) continue;
    villagesByPostalCode.set(village.postalCode, [
      ...(villagesByPostalCode.get(village.postalCode) || []),
      village,
    ]);
  }

  const resolveFromPostal = (address: string, postalCode: string): RegionMatch | null => {
    const candidates = villagesByPostalCode.get(postalCode) || [];
    if (candidates.length === 0) return null;

    const scored = candidates.map((village) => {
      const district = districtById.get(village.districtId);
      const regency = regencyById.get(village.regencyId);
      const province = provinceById.get(village.provinceId);
      let score = 0;
      if (includesLabel(address, village.label)) score += 16;
      if (district && includesLabel(address, district.label)) score += 8;
      if (regency && aliasesForRegency(regency.label).some((alias) => includesLabel(address, alias))) score += 4;
      if (province && aliasesForProvince(province.label).some((alias) => includesLabel(address, alias))) score += 2;
      return { village, score };
    }).sort((left, right) => right.score - left.score);

    const bestScore = scored[0].score;
    const narrowed = bestScore > 0
      ? scored.filter((candidate) => candidate.score === bestScore).map((candidate) => candidate.village)
      : candidates;

    return {
      provinceId: uniqueValue(narrowed.map((item) => item.provinceId)),
      regencyId: uniqueValue(narrowed.map((item) => item.regencyId)),
      districtId: uniqueValue(narrowed.map((item) => item.districtId)),
      villageId: narrowed.length === 1 ? narrowed[0].id : null,
      postalCode,
      confidence: 'postal',
    };
  };

  const resolveFromText = (address: string, postalCode: string | null): RegionMatch => {
    const province = provinces
      .map((item) => ({ item, aliases: aliasesForProvince(item.label) }))
      .sort((left, right) => Math.max(...right.aliases.map((alias) => alias.length)) - Math.max(...left.aliases.map((alias) => alias.length)))
      .find(({ aliases }) => aliases.some((alias) => includesLabel(address, alias)))
      ?.item;

    if (!province) {
      return {
        provinceId: null,
        regencyId: null,
        districtId: null,
        villageId: null,
        postalCode,
        confidence: 'none',
      };
    }

    const provinceDistricts = districtsByProvince.get(province.id) || [];
    const district = provinceDistricts
      .filter((item) => includesLabel(address, item.label))
      .sort((left, right) => right.label.length - left.label.length)[0];
    const provinceRegencies = regenciesByProvince.get(province.id) || [];
    const regency = district
      ? regencyById.get(district.regencyId)
      : provinceRegencies
        .filter((item) => aliasesForRegency(item.label).some((alias) => includesLabel(address, alias)))
        .sort((left, right) => right.label.length - left.label.length)[0];

    return {
      provinceId: province.id,
      regencyId: regency?.id || null,
      districtId: district?.id || null,
      villageId: null,
      postalCode,
      confidence: 'text',
    };
  };

  const results = sales.map((sale) => {
    const address = normalize(sale.shippingAddress || '');
    const postalCode = normalize(sale.shippingPostalCode || '').match(/\b\d{5}\b/)?.[0]
      || address.match(/\b\d{5}\b/)?.[0]
      || null;
    const match = (postalCode ? resolveFromPostal(address, postalCode) : null)
      || resolveFromText(address, postalCode);
    const changed = Boolean(match.provinceId) && (
      !sameValue(sale.shippingProvinceId, match.provinceId)
      || !sameValue(sale.shippingRegencyId, match.regencyId)
      || !sameValue(sale.shippingDistrictId, match.districtId)
      || !sameValue(sale.shippingVillageId, match.villageId)
      || (sale.shippingPostalCode || null) !== match.postalCode
    );
    return { sale, match, changed };
  });

  const matched = results.filter((item) => item.match.provinceId);
  const changed = matched.filter((item) => item.changed);
  const unmatched = results.filter((item) => !item.match.provinceId);
  console.log({
    mode: applyChanges ? 'apply' : 'dry-run',
    total: results.length,
    alreadyCorrect: matched.length - changed.length,
    changes: changed.length,
    mappedProvinces: matched.length,
    mappedRegencies: matched.filter((item) => item.match.regencyId).length,
    mappedDistricts: matched.filter((item) => item.match.districtId).length,
    mappedVillages: matched.filter((item) => item.match.villageId).length,
    postalMatches: matched.filter((item) => item.match.confidence === 'postal').length,
    textMatches: matched.filter((item) => item.match.confidence === 'text').length,
    unmatched: unmatched.length,
  });

  if (unmatched.length > 0) {
    console.log('Contoh belum terpetakan:', unmatched.slice(0, 10).map(({ sale }) => ({
      saleNumber: sale.saleNumber,
      shippingAddress: sale.shippingAddress,
    })));
  }
  if (!applyChanges) {
    console.log('Dry-run selesai. Jalankan dengan --apply untuk menyimpan hasil.');
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    for (const { sale, match } of changed) {
      await sale.update({
        shippingProvinceId: match.provinceId,
        shippingRegencyId: match.regencyId,
        shippingDistrictId: match.districtId,
        shippingVillageId: match.villageId,
        shippingPostalCode: match.postalCode,
      }, { transaction });
    }
    await transaction.commit();
    console.log(`Berhasil merekonsiliasi ${changed.length} penjualan.`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
