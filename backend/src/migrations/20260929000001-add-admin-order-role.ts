import { QueryInterface, QueryTypes } from 'sequelize';

const ADMIN_ORDER = 'ADMIN_ORDER';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO roles (id, name, description, createdAt, updatedAt)
      SELECT UUID(), 'ADMIN_ORDER', 'Admin Order: akses seperti User, khusus Pelunasan dapat melihat semua data user.', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN_ORDER')
    `);

    const features = await queryInterface.sequelize.query(
      'SELECT id, allowedRoles FROM feature_flags',
      { type: QueryTypes.SELECT }
    ) as Array<{ id: string; allowedRoles: unknown }>;

    for (const feature of features) {
      let roles: string[] = [];
      if (Array.isArray(feature.allowedRoles)) {
        roles = feature.allowedRoles.map(String);
      } else if (typeof feature.allowedRoles === 'string') {
        try {
          const parsed = JSON.parse(feature.allowedRoles);
          roles = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          roles = [];
        }
      }

      const upperRoles = roles.map((role) => role.toUpperCase());
      if (upperRoles.includes('USER') && !upperRoles.includes(ADMIN_ORDER)) {
        await queryInterface.sequelize.query(
          'UPDATE feature_flags SET allowedRoles = :allowedRoles, updatedAt = NOW() WHERE id = :id',
          {
            replacements: {
              id: feature.id,
              allowedRoles: JSON.stringify([...roles, ADMIN_ORDER]),
            },
          }
        );
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const features = await queryInterface.sequelize.query(
      'SELECT id, allowedRoles FROM feature_flags',
      { type: QueryTypes.SELECT }
    ) as Array<{ id: string; allowedRoles: unknown }>;

    for (const feature of features) {
      let roles: string[] = [];
      if (Array.isArray(feature.allowedRoles)) {
        roles = feature.allowedRoles.map(String);
      } else if (typeof feature.allowedRoles === 'string') {
        try {
          const parsed = JSON.parse(feature.allowedRoles);
          roles = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          roles = [];
        }
      }

      const nextRoles = roles.filter((role) => role.toUpperCase() !== ADMIN_ORDER);
      if (nextRoles.length !== roles.length) {
        await queryInterface.sequelize.query(
          'UPDATE feature_flags SET allowedRoles = :allowedRoles, updatedAt = NOW() WHERE id = :id',
          {
            replacements: {
              id: feature.id,
              allowedRoles: JSON.stringify(nextRoles),
            },
          }
        );
      }
    }

    await queryInterface.sequelize.query(`DELETE FROM roles WHERE name = 'ADMIN_ORDER'`);
  },
};
