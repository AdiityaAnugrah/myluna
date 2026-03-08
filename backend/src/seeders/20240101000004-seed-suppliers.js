'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    await queryInterface.bulkInsert('suppliers', [
      {
        id: uuidv4(),
        name: 'PT Elektronik Jaya',
        contact: 'Budi Santoso',
        phone: '021-12345678',
        email: 'budi@elektronikjaya.com',
        address: 'Jl. Sudirman No. 123, Jakarta',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'CV Furniture Indah',
        contact: 'Siti Rahayu',
        phone: '021-87654321',
        email: 'siti@furnitureindah.com',
        address: 'Jl. Thamrin No. 456, Jakarta',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Toko Alat Tulis Sejahtera',
        contact: 'Ahmad Wijaya',
        phone: '021-11223344',
        email: 'ahmad@alattulis.com',
        address: 'Jl. Gatot Subroto No. 789, Jakarta',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'PT Food Supplier Indonesia',
        contact: 'Dewi Lestari',
        phone: '021-99887766',
        email: 'dewi@foodsupplier.com',
        address: 'Jl. HR Rasuna Said No. 321, Jakarta',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('suppliers', null, {});
  },
};
