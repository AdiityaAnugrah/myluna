import { QueryInterface, QueryTypes } from 'sequelize';

interface DuplicateRegency {
  provinceId: number;
  label: string;
  kabupatenId: number;
  kotaId: number;
}

module.exports = {
  async up(queryInterface: QueryInterface) {
    const duplicates = await queryInterface.sequelize.query<DuplicateRegency>(
      `
        SELECT
          provinsi_id AS provinceId,
          label,
          MIN(id) AS kabupatenId,
          MAX(id) AS kotaId
        FROM kabupaten
        WHERE label NOT LIKE 'Kabupaten %'
          AND label NOT LIKE 'Kota %'
        GROUP BY provinsi_id, label
        HAVING COUNT(*) = 2
      `,
      { type: QueryTypes.SELECT }
    );

    for (const duplicate of duplicates) {
      await queryInterface.bulkUpdate(
        'kabupaten',
        { label: `Kabupaten ${duplicate.label}` },
        { id: duplicate.kabupatenId }
      );
      await queryInterface.bulkUpdate(
        'kabupaten',
        { label: `Kota ${duplicate.label}` },
        { id: duplicate.kotaId }
      );
    }
  },

  async down(queryInterface: QueryInterface) {
    const normalizedPairs = await queryInterface.sequelize.query<{
      kabupatenId: number;
      kotaId: number;
      label: string;
    }>(
      `
        SELECT
          kabupaten.id AS kabupatenId,
          kota.id AS kotaId,
          SUBSTRING(kabupaten.label, 11) AS label
        FROM kabupaten kabupaten
        INNER JOIN kabupaten kota
          ON kota.provinsi_id = kabupaten.provinsi_id
          AND kota.label = CONCAT('Kota ', SUBSTRING(kabupaten.label, 11))
        WHERE kabupaten.label LIKE 'Kabupaten %'
      `,
      { type: QueryTypes.SELECT }
    );

    for (const pair of normalizedPairs) {
      await queryInterface.bulkUpdate('kabupaten', { label: pair.label }, { id: pair.kabupatenId });
      await queryInterface.bulkUpdate('kabupaten', { label: pair.label }, { id: pair.kotaId });
    }
  },
};
