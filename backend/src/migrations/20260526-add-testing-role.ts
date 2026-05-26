import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO roles (id, name, description, createdAt, updatedAt)
      SELECT UUID(), 'TESTING', 'Role khusus simulasi. Semua aksi tulis tidak mengubah data produksi.', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE UPPER(name) = 'TESTING'
      )
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM roles WHERE UPPER(name) = 'TESTING'
    `);
  },
};
