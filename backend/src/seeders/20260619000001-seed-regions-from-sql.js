const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');

const REGION_TABLES = ['provinsi', 'kabupaten', 'kecamatan', 'kelurahan'];
const EXPECTED_COUNTS = {
  provinsi: 34,
  kabupaten: 501,
  kecamatan: 6994,
  kelurahan: 187878,
};

function extractRegionInsertStatements(sql) {
  const startPattern = /INSERT\s+INTO\s+`(provinsi|kabupaten|kecamatan|kelurahan)`/gi;
  const statements = [];
  let match;

  while ((match = startPattern.exec(sql)) !== null) {
    const table = match[1].toLowerCase();
    const start = match.index;
    let inString = false;

    for (let index = startPattern.lastIndex; index < sql.length; index += 1) {
      const char = sql[index];
      const next = sql[index + 1];

      if (inString && char === '\\') {
        index += 1;
        continue;
      }

      if (char === "'") {
        if (inString && next === "'") {
          index += 1;
          continue;
        }
        inString = !inString;
        continue;
      }

      if (char === ';' && !inString) {
        statements.push({
          table,
          sql: sql.slice(start, index + 1),
        });
        startPattern.lastIndex = index + 1;
        break;
      }
    }
  }

  return statements;
}

module.exports = {
  async up(queryInterface) {
    const counts = {};
    for (const table of REGION_TABLES) {
      const [result] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS total FROM \`${table}\``,
        { type: QueryTypes.SELECT }
      );
      counts[table] = Number(result.total);
    }

    const dataIsComplete = REGION_TABLES.every(
      (table) => counts[table] >= EXPECTED_COUNTS[table]
    );

    if (dataIsComplete) {
      console.log('Data wilayah sudah lengkap, import dilewati.', counts);
      return;
    }

    const sqlPath = path.resolve(__dirname, '../../../datawilayah/datawilayah.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`File data wilayah tidak ditemukan: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = extractRegionInsertStatements(sql);

    if (statements.length === 0) {
      throw new Error('Tidak ada INSERT wilayah yang ditemukan di datawilayah.sql');
    }

    for (const table of REGION_TABLES) {
      const tableStatements = statements.filter((statement) => statement.table === table);

      for (const statement of tableStatements) {
        await queryInterface.sequelize.query(
          statement.sql.replace(/^INSERT\s+INTO/i, 'INSERT IGNORE INTO')
        );
      }
    }
  },

  async down(queryInterface) {
    for (const table of REGION_TABLES.slice().reverse()) {
      await queryInterface.bulkDelete(table, null, {});
    }
  },
};
