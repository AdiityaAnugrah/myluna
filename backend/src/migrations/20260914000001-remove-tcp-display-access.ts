import { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('feature_flags')) return;

    await queryInterface.sequelize.query(
      `UPDATE feature_flags
       SET allowedRoles = :allowedRoles, updatedAt = NOW()
       WHERE \`key\` = 'display'`,
      { replacements: { allowedRoles: JSON.stringify(['USER', 'ADMIN', 'SUPER_ADMIN', 'DEV']) } }
    );
  },

  async down(queryInterface: QueryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('feature_flags')) return;

    await queryInterface.sequelize.query(
      `UPDATE feature_flags
       SET allowedRoles = :allowedRoles, updatedAt = NOW()
       WHERE \`key\` = 'display'`,
      { replacements: { allowedRoles: JSON.stringify(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN', 'DEV']) } }
    );
  },
};
