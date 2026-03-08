'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    // Get Role IDs
    const roles = await queryInterface.sequelize.query(
      "SELECT id, name FROM roles WHERE name IN ('ADMIN', 'USER')",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const adminRoleId = roles.find(r => r.name === 'ADMIN')?.id;
    const userRoleId = roles.find(r => r.name === 'USER')?.id;
    
    if (!adminRoleId || !userRoleId) {
      console.error('Roles not found. Please ensure roles are seeded.');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const usersToInsert = [];

    // Check and prepare Staff (ADMIN)
    const [existingStaff] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'staff@luna.com'"
    );
    
    if (existingStaff.length === 0) {
      usersToInsert.push({
        id: uuidv4(),
        roleId: adminRoleId,
        username: 'staff',
        email: 'staff@luna.com',
        password: hashedPassword,
        fullName: 'Staff Administrator',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Check and prepare User (USER)
    const [existingUser] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'user@luna.com'"
    );
    
    if (existingUser.length === 0) {
      usersToInsert.push({
        id: uuidv4(),
        roleId: userRoleId,
        username: 'user',
        email: 'user@luna.com',
        password: hashedPassword,
        fullName: 'Regular User',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert('users', usersToInsert);
      console.log(`Seeded ${usersToInsert.length} new users.`);
    } else {
      console.log('Test users already exist.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { 
      email: ['staff@luna.com', 'user@luna.com'] 
    }, {});
  },
};
