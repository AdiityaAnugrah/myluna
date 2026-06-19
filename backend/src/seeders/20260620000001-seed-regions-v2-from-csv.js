const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');

const DATA_DIRECTORY = path.resolve(__dirname, '../../../datawilayah/v2');
const SOURCES = {
  province: {
    file: '01province.csv',
    count: 38,
    checksum: '52deb3c9bcf74e372823deb079cdf0d00cbe0b89e923c51b17f9d6c4a788c3ab',
  },
  regency: {
    file: '02regency.csv',
    count: 514,
    checksum: 'b457ce97ef43f5a8ee401bd97d067752cb88f83f7142823580a3a34394b9b459',
  },
  district: {
    file: '03district.csv',
    count: 7285,
    checksum: 'e60740376acf714a973bcce0518458caa3356f3e80c4d9b0d76b9d941010768a',
  },
  village: {
    file: '04village.csv',
    count: 83762,
    checksum: '8597fd5acdcdafa9dffdc7b713202416704bbf09a98e1061b4bba8fe62eb0abe',
  },
};

const PROVINCE_ALIASES = new Map([
  ['NANGGROE ACEH DARUSSALAM', 'ACEH'],
  ['NANGGROE ACEH DARUSSALAM NAD', 'ACEH'],
  ['KEP BANGKA BELITUNG', 'KEPULAUAN BANGKA BELITUNG'],
  ['BANGKA BELITUNG', 'KEPULAUAN BANGKA BELITUNG'],
  ['DKI JAKARTA', 'DAERAH KHUSUS IBUKOTA JAKARTA'],
  ['DI YOGYAKARTA', 'DAERAH ISTIMEWA YOGYAKARTA'],
  ['DIY', 'DAERAH ISTIMEWA YOGYAKARTA'],
  ['NTB', 'NUSA TENGGARA BARAT'],
  ['NUSA TENGGARA BARAT NTB', 'NUSA TENGGARA BARAT'],
  ['NTT', 'NUSA TENGGARA TIMUR'],
  ['NUSA TENGGARA TIMUR NTT', 'NUSA TENGGARA TIMUR'],
]);

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

function readSource(source) {
  const filePath = path.join(DATA_DIRECTORY, source.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset wilayah tidak ditemukan: ${filePath}`);
  }

  const contents = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const checksum = crypto.createHash('sha256').update(contents).digest('hex');
  if (checksum !== source.checksum) {
    throw new Error(`Checksum ${source.file} tidak sesuai. Diperoleh ${checksum}`);
  }

  const lines = contents.split(/\r?\n/).filter((line) => line.trim() !== '');
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });

  if (rows.length !== source.count) {
    throw new Error(`${source.file} berisi ${rows.length} baris, seharusnya ${source.count}`);
  }
  return rows;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase();
}

function provinceKey(value) {
  const normalized = normalizeName(value);
  return PROVINCE_ALIASES.get(normalized) || normalized;
}

function regencyBaseName(value) {
  return normalizeName(value)
    .replace(/^(KABUPATEN|KAB)\s+/, '')
    .replace(/^(KOTA ADMINISTRASI|KOTA ADM|KOTA)\s+/, '')
    .trim();
}

function regencyType(value, code = '') {
  const normalized = normalizeName(value);
  if (/^(KABUPATEN|KAB)\s/.test(normalized)) return 'kabupaten';
  if (/^KOTA(\s|$)/.test(normalized)) return 'kota';
  const suffix = Number(String(code).slice(-2));
  if (Number.isInteger(suffix)) return suffix >= 71 ? 'kota' : 'kabupaten';
  return null;
}

function groupBy(rows, keyFactory) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFactory(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

async function insertInChunks(queryInterface, table, rows, updateOnDuplicate, transaction) {
  const chunkSize = 1000;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    await queryInterface.bulkInsert(table, rows.slice(offset, offset + chunkSize), {
      updateOnDuplicate,
      transaction,
    });
  }
}

function findRegencyCandidate(candidates, source) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const type = regencyType(source.regency_name, source.regency_id);
  return candidates.find((candidate) => regencyType(candidate.label) === type) || null;
}

module.exports = {
  async up(queryInterface) {
    const provinces = readSource(SOURCES.province);
    const regencies = readSource(SOURCES.regency);
    const districts = readSource(SOURCES.district);
    const villages = readSource(SOURCES.village);

    if (villages.some((row) => !/^\d{5}$/.test(row.postal_code))) {
      throw new Error('Dataset kelurahan memiliki kode pos yang tidak valid');
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      const [existingProvinces, existingRegencies, existingDistricts, existingVillages] = await Promise.all([
        queryInterface.sequelize.query('SELECT id, code, label FROM provinsi', { type: QueryTypes.SELECT, transaction }),
        queryInterface.sequelize.query('SELECT id, code, provinsi_id AS provinceId, label FROM kabupaten', { type: QueryTypes.SELECT, transaction }),
        queryInterface.sequelize.query('SELECT id, code, provinsi_id AS provinceId, kabupaten_id AS regencyId, label FROM kecamatan', { type: QueryTypes.SELECT, transaction }),
        queryInterface.sequelize.query('SELECT id, code, provinsi_id AS provinceId, kabupaten_id AS regencyId, kecamatan_id AS districtId, label FROM kelurahan', { type: QueryTypes.SELECT, transaction }),
      ]);

      const maximumId = (rows) => rows.reduce(
        (maximum, row) => Math.max(maximum, Number(row.id)),
        0
      );
      const nextId = {
        province: maximumId(existingProvinces),
        regency: maximumId(existingRegencies),
        district: maximumId(existingDistricts),
        village: maximumId(existingVillages),
      };
      const stats = {
        province: { matched: 0, inserted: 0 },
        regency: { matched: 0, inserted: 0 },
        district: { matched: 0, inserted: 0 },
        village: { matched: 0, inserted: 0 },
      };

      for (const table of ['kelurahan', 'kecamatan', 'kabupaten', 'provinsi']) {
        await queryInterface.bulkUpdate(table, { isActive: false }, {}, { transaction });
      }

      const provinceByCode = new Map(existingProvinces.filter((row) => row.code).map((row) => [row.code, row]));
      const provinceByName = new Map(existingProvinces.map((row) => [provinceKey(row.label), row]));
      const provinceIdByCode = new Map();
      const usedProvinceIds = new Set();
      const provinceRows = provinces.map((source) => {
        const codeMatch = provinceByCode.get(source.province_id);
        const nameMatch = provinceByName.get(provinceKey(source.province_name));
        const existing = codeMatch && !usedProvinceIds.has(Number(codeMatch.id))
          ? codeMatch
          : nameMatch && !usedProvinceIds.has(Number(nameMatch.id)) ? nameMatch : null;
        const id = existing ? Number(existing.id) : ++nextId.province;
        usedProvinceIds.add(id);
        stats.province[existing ? 'matched' : 'inserted'] += 1;
        provinceIdByCode.set(source.province_id, id);
        return { id, code: source.province_id, label: source.province_name, isActive: true };
      });
      await insertInChunks(queryInterface, 'provinsi', provinceRows, ['code', 'label', 'isActive'], transaction);

      const regencyByCode = new Map(existingRegencies.filter((row) => row.code).map((row) => [row.code, row]));
      const regencyByName = groupBy(existingRegencies, (row) => `${row.provinceId}|${regencyBaseName(row.label)}`);
      const regencyIdByCode = new Map();
      const usedRegencyIds = new Set();
      const regencyRows = regencies.map((source) => {
        const provinceId = provinceIdByCode.get(source.province_id);
        const candidates = (regencyByName.get(`${provinceId}|${regencyBaseName(source.regency_name)}`) || [])
          .filter((candidate) => !usedRegencyIds.has(Number(candidate.id)));
        const codeMatch = regencyByCode.get(source.regency_id);
        const existing = codeMatch && !usedRegencyIds.has(Number(codeMatch.id))
          ? codeMatch
          : findRegencyCandidate(candidates, source);
        const id = existing ? Number(existing.id) : ++nextId.regency;
        usedRegencyIds.add(id);
        stats.regency[existing ? 'matched' : 'inserted'] += 1;
        regencyIdByCode.set(source.regency_id, id);
        return { id, code: source.regency_id, provinsi_id: provinceId, label: source.regency_name, isActive: true };
      });
      await insertInChunks(queryInterface, 'kabupaten', regencyRows, ['code', 'provinsi_id', 'label', 'isActive'], transaction);

      const districtByCode = new Map(existingDistricts.filter((row) => row.code).map((row) => [row.code, row]));
      const districtByName = groupBy(existingDistricts, (row) => `${row.regencyId}|${normalizeName(row.label)}`);
      const districtIdByCode = new Map();
      const usedDistrictIds = new Set();
      const districtRows = districts.map((source) => {
        const provinceId = provinceIdByCode.get(source.province_id);
        const regencyId = regencyIdByCode.get(source.regency_id);
        const candidates = (districtByName.get(`${regencyId}|${normalizeName(source.district_name)}`) || [])
          .filter((candidate) => !usedDistrictIds.has(Number(candidate.id)));
        const codeMatch = districtByCode.get(source.district_id);
        const existing = codeMatch && !usedDistrictIds.has(Number(codeMatch.id))
          ? codeMatch
          : candidates.length === 1 ? candidates[0] : null;
        const id = existing ? Number(existing.id) : ++nextId.district;
        usedDistrictIds.add(id);
        stats.district[existing ? 'matched' : 'inserted'] += 1;
        districtIdByCode.set(source.district_id, id);
        return { id, code: source.district_id, provinsi_id: provinceId, kabupaten_id: regencyId, label: source.district_name, isActive: true };
      });
      await insertInChunks(queryInterface, 'kecamatan', districtRows, ['code', 'provinsi_id', 'kabupaten_id', 'label', 'isActive'], transaction);

      const villageByCode = new Map(existingVillages.filter((row) => row.code).map((row) => [row.code, row]));
      const villageByName = groupBy(existingVillages, (row) => `${row.districtId}|${normalizeName(row.label)}`);
      const usedVillageIds = new Set();
      const villageRows = villages.map((source) => {
        const provinceId = provinceIdByCode.get(source.province_id);
        const regencyId = regencyIdByCode.get(source.regency_id);
        const districtId = districtIdByCode.get(source.district_id);
        const candidates = (villageByName.get(`${districtId}|${normalizeName(source.village_name)}`) || [])
          .filter((candidate) => !usedVillageIds.has(Number(candidate.id)));
        const codeMatch = villageByCode.get(source.village_id);
        const existing = codeMatch && !usedVillageIds.has(Number(codeMatch.id))
          ? codeMatch
          : candidates.length === 1 ? candidates[0] : null;
        const id = existing ? Number(existing.id) : ++nextId.village;
        usedVillageIds.add(id);
        stats.village[existing ? 'matched' : 'inserted'] += 1;
        return {
          id,
          code: source.village_id,
          provinsi_id: provinceId,
          kabupaten_id: regencyId,
          kecamatan_id: districtId,
          label: source.village_name,
          kodepos: source.postal_code,
          isActive: true,
        };
      });
      await insertInChunks(queryInterface, 'kelurahan', villageRows, ['code', 'provinsi_id', 'kabupaten_id', 'kecamatan_id', 'label', 'kodepos', 'isActive'], transaction);

      console.log('Import master wilayah v2 selesai.', stats);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ['provinsi', 'kabupaten', 'kecamatan', 'kelurahan']) {
        await queryInterface.bulkUpdate(table, { code: null, isActive: true }, {}, { transaction });
      }
    });
  },
};
