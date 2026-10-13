import { QueryInterface } from 'sequelize';

const ANALYTICS_OPERATIONAL_ROLES = ['USER', 'ADMIN_ORDER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV'];
const ANALYTICS_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DEV'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `
        UPDATE feature_flags
        SET allowedRoles = :allowedRoles, updatedAt = NOW()
        WHERE \`key\` = 'analytics'
      `,
      {
        replacements: {
          allowedRoles: JSON.stringify(ANALYTICS_OPERATIONAL_ROLES),
        },
      }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `
        UPDATE feature_flags
        SET allowedRoles = :allowedRoles, updatedAt = NOW()
        WHERE \`key\` = 'analytics'
      `,
      {
        replacements: {
          allowedRoles: JSON.stringify(ANALYTICS_ADMIN_ROLES),
        },
      }
    );
  },
};
