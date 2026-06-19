import { DataTypes, QueryInterface } from 'sequelize';

async function hasIndex(queryInterface: QueryInterface, table: string, indexName: string) {
  const indexes = await queryInterface.showIndex(table) as unknown as Array<{ name: string }>;
  return indexes.some((index) => index.name === indexName);
}

const regionTables = [
  { table: 'provinsi', codeLength: 2 },
  { table: 'kabupaten', codeLength: 4 },
  { table: 'kecamatan', codeLength: 6 },
  { table: 'kelurahan', codeLength: 10 },
];

module.exports = {
  async up(queryInterface: QueryInterface) {
    for (const region of regionTables) {
      const columns = await queryInterface.describeTable(region.table);

      if (!columns.code) {
        await queryInterface.addColumn(region.table, 'code', {
          type: DataTypes.STRING(region.codeLength),
          allowNull: true,
        });
      }

      if (!columns.isActive) {
        await queryInterface.addColumn(region.table, 'isActive', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      }

      const codeIndex = `${region.table}_code_unique`;
      if (!(await hasIndex(queryInterface, region.table, codeIndex))) {
        await queryInterface.addIndex(region.table, ['code'], {
          name: codeIndex,
          unique: true,
        });
      }

      const activeIndex = `${region.table}_is_active`;
      if (!(await hasIndex(queryInterface, region.table, activeIndex))) {
        await queryInterface.addIndex(region.table, ['isActive'], {
          name: activeIndex,
        });
      }
    }
  },

  async down(queryInterface: QueryInterface) {
    for (const region of [...regionTables].reverse()) {
      const columns = await queryInterface.describeTable(region.table);

      if (await hasIndex(queryInterface, region.table, `${region.table}_is_active`)) {
        await queryInterface.removeIndex(region.table, `${region.table}_is_active`);
      }
      if (await hasIndex(queryInterface, region.table, `${region.table}_code_unique`)) {
        await queryInterface.removeIndex(region.table, `${region.table}_code_unique`);
      }
      if (columns.isActive) await queryInterface.removeColumn(region.table, 'isActive');
      if (columns.code) await queryInterface.removeColumn(region.table, 'code');
    }
  },
};
