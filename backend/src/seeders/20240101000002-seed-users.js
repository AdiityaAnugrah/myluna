'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    // Get SUPER_ADMIN role ID
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'SUPER_ADMIN' LIMIT 1"
    );
    
    if (roles.length === 0) {
      throw new Error('SUPER_ADMIN role not found. Please run roles seeder first.');
    }
    
    const superAdminRoleId = roles[0].id;
    
    // Force cleanup of any existing admin user to avoid unique constraint errors
    await queryInterface.sequelize.query(
      "DELETE FROM users WHERE username = 'admin' OR email IN ('admin@wms.com', 'admin@luna.com')"
    );
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        roleId: superAdminRoleId,
        username: 'admin',
        email: 'admin@luna.com',
        password: hashedPassword,
        fullName: 'System Administrator',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@luna.com' }, {});
  },
};
