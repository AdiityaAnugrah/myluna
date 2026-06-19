import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import {
  District,
  Province,
  Regency,
  Sale,
  Village,
} from '../models';

type RegionMatch = {
  provinceId: number | null;
  regencyId: number | null;
  districtId: number | null;
  villageId: number | null;
  postalCode: string | null;
  confidence: 'postal' | 'text' | 'none';
};

const provinceAliases: Record<string, string[]> = {
  'NANGGROE ACEH DARUSSALAM NAD': ['ACEH', 'NAD'],
  'NUSA TENGGARA BARAT NTB': ['NUSA TENGGARA BARAT', 'NTB'],
  'NUSA TENGGARA TIMUR NTT': ['NUSA TENGGARA TIMUR', 'NTT'],
  'KEPULAUAN RIAU': ['KEPULAUAN RIAU', 'KEPRI'],
  'BANGKA BELITUNG': ['BANGKA BELITUNG', 'KEPULAUAN BANGKA BELITUNG'],
  'DKI JAKARTA': ['DKI JAKARTA', 'JAKARTA'],
  'DI YOGYAKARTA': ['DI YOGYAKARTA', 'DAERAH ISTIMEWA YOGYAKARTA', 'YOGYAKARTA'],
  'JAWA BARAT': ['JAWA BARAT', 'WEST JAVA'],
  'JAWA TENGAH': ['JAWA TENGAH', 'CENTRAL JAVA'],
  'JAWA TIMUR': ['JAWA TIMUR', 'EAST JAVA'],
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\bKAB\.\s*/g, 'KABUPATEN ')
    .replace(/SULAWE\s+SI\s+SE\s+LATAN/g, 'SULAWESI SELATAN')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesLabel(address: string, label: string) {
  const normalizedLabel = normalize(label);
  return normalizedLabel.length >= 3 && ` ${address} `.includes(` ${normalizedLabel} `);
}

function getProvinceAliases(label: string) {
  const normalizedLabel = normalize(label);
  return provinceAliases[normalizedLabel] || [normalizedLabel];
}

async function main() {
  const applyChanges = process.argv.includes('--apply');

  const [sales, provinces, regencies, districts] = await Promise.all([
    Sale.findAll({
      where: {
        shippingProvinceId: null,
        shippingAddress: { [Op.ne]: null },
        isInitialBalance: false,
      },
      attributes: ['id', 'saleNumber', 'shippingAddress'],
      order: [['saleDate', 'ASC']],
    }),
    Province.findAll({ order: [['label', 'ASC']] }),
    Regency.findAll({ order: [['label', 'ASC']] }),
    District.findAll({ order: [['label', 'ASC']] }),
  ]);

  const regenciesByProvince = new Map<number, Regency[]>();
  const districtsByProvince = new Map<number, District[]>();
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

  const postalCache = new Map<string, Village[]>();

  const resolveFromPostal = async (address: string, postalCode: string): Promise<RegionMatch | null> => {
    if (!postalCache.has(postalCode)) {
      postalCache.set(
        postalCode,
        await Village.findAll({
          where: { postalCode },
          order: [['label', 'ASC']],
        })
      );
    }

    const candidates = postalCache.get(postalCode) || [];
    if (candidates.length === 0) return null;

    const scored = candidates.map((village) => {
      let score = 10;
      if (includesLabel(address, village.label)) score += 8;
      const district = districts.find((item) => item.id === village.districtId);
      const regency = regencies.find((item) => item.id === village.regencyId);
      const province = provinces.find((item) => item.id === village.provinceId);
      if (district && includesLabel(address, district.label)) score += 6;
      if (regency && includesLabel(address, regency.label)) score += 4;
      if (province && getProvinceAliases(province.label).some((alias) => includesLabel(address, alias))) {
        score += 3;
      }
      return { village, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const equallyRanked = scored.filter((item) => item.score === best.score);
    const villageId = equallyRanked.length === 1 || includesLabel(address, best.village.label)
      ? best.village.id
      : null;

    return {
      provinceId: best.village.provinceId,
      regencyId: best.village.regencyId,
      districtId: best.village.districtId,
      villageId,
      postalCode,
      confidence: 'postal',
    };
  };

  const resolveFromText = (address: string): RegionMatch => {
    const province = provinces
      .map((item) => ({
        item,
        aliases: getProvinceAliases(item.label).sort((a, b) => b.length - a.length),
      }))
      .sort((a, b) => b.aliases[0].length - a.aliases[0].length)
      .find(({ aliases }) => aliases.some((alias) => includesLabel(address, alias)))
      ?.item;

    if (!province) {
      return {
        provinceId: null,
        regencyId: null,
        districtId: null,
        villageId: null,
        postalCode: null,
        confidence: 'none',
      };
    }

    const provinceRegencies = regenciesByProvince.get(province.id) || [];
    const provinceDistricts = districtsByProvince.get(province.id) || [];
    const district = provinceDistricts
      .filter((item) => includesLabel(address, item.label))
      .sort((a, b) => b.label.length - a.label.length)[0];

    const regencyCandidates = provinceRegencies
      .filter((item) => includesLabel(address, item.label))
      .sort((a, b) => b.label.length - a.label.length);
    const regency = district
      ? regencyCandidates.find((item) => item.id === district.regencyId)
        || provinceRegencies.find((item) => item.id === district.regencyId)
      : regencyCandidates[0];

    return {
      provinceId: province.id,
      regencyId: regency?.id || null,
      districtId: district?.id || null,
      villageId: null,
      postalCode: null,
      confidence: 'text',
    };
  };

  const results: Array<{ sale: Sale; match: RegionMatch }> = [];

  for (const sale of sales) {
    const address = normalize(sale.shippingAddress || '');
    const postalCode = address.match(/\b\d{5}\b/)?.[0] || null;
    const postalMatch = postalCode ? await resolveFromPostal(address, postalCode) : null;
    results.push({
      sale,
      match: postalMatch || resolveFromText(address),
    });
  }

  const matched = results.filter((item) => item.match.provinceId);
  const unmatched = results.filter((item) => !item.match.provinceId);
  const postalMatches = matched.filter((item) => item.match.confidence === 'postal');
  const textMatches = matched.filter((item) => item.match.confidence === 'text');
  const mappedRegencies = matched.filter((item) => item.match.regencyId);
  const mappedDistricts = matched.filter((item) => item.match.districtId);
  const mappedVillages = matched.filter((item) => item.match.villageId);

  console.log({
    mode: applyChanges ? 'apply' : 'dry-run',
    total: results.length,
    mappedProvinces: matched.length,
    mappedRegencies: mappedRegencies.length,
    mappedDistricts: mappedDistricts.length,
    mappedVillages: mappedVillages.length,
    postalMatches: postalMatches.length,
    textMatches: textMatches.length,
    unmatched: unmatched.length,
  });

  if (unmatched.length > 0) {
    console.log(
      'Unmatched samples:',
      unmatched.slice(0, 10).map(({ sale }) => ({
        saleNumber: sale.saleNumber,
        shippingAddress: sale.shippingAddress,
      }))
    );
  }

  if (!applyChanges) {
    console.log('Dry-run selesai. Jalankan dengan --apply untuk menyimpan hasil.');
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    for (const { sale, match } of matched) {
      await sale.update(
        {
          shippingProvinceId: match.provinceId,
          shippingRegencyId: match.regencyId,
          shippingDistrictId: match.districtId,
          shippingVillageId: match.villageId,
          shippingPostalCode: match.postalCode,
        },
        { transaction }
      );
    }
    await transaction.commit();
    console.log(`Berhasil memperbarui ${matched.length} penjualan.`);
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
