'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    // Check if role already exists
    const existingRole = await queryInterface.rawSelect('roles', {
      where: {
        name: 'TCP',
      },
    }, ['id']);

    if (!existingRole) {
      await queryInterface.bulkInsert('roles', [
        {
          id: uuidv4(),
          name: 'TCP',
          description: 'Team Control Penjualan - Approver for sales',
          createdAt: now,
          updatedAt: now,
        },
      ]);
      console.log('TCP role seeded successfully.');
    } else {
      console.log('TCP role already exists.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', { name: 'TCP' }, {});
  },
};
