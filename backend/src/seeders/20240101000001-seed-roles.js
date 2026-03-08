'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    // Check if roles already exist
    const existingRoles = await queryInterface.sequelize.query(
      'SELECT name FROM roles',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const existingRoleNames = existingRoles.map(r => r.name);
    
    const rolesToInsert = [
      {
        id: uuidv4(),
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with full system access',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'ADMIN',
        description: 'Administrator with most system access',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'USER',
        description: 'Regular user with limited access',
        createdAt: now,
        updatedAt: now,
      },
    ].filter(role => !existingRoleNames.includes(role.name));
    
    if (rolesToInsert.length > 0) {
      await queryInterface.bulkInsert('roles', rolesToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  },
};

