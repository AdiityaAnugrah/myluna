'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const suppliers = [
      {
        name: 'PT Elektronik Jaya',
        contact: 'Budi Santoso',
        phone: '021-12345678',
        email: 'budi@elektronikjaya.com',
        address: 'Jl. Sudirman No. 123, Jakarta',
        isActive: true,
      },
      {
        name: 'CV Furniture Indah',
        contact: 'Siti Rahayu',
        phone: '021-87654321',
        email: 'siti@furnitureindah.com',
        address: 'Jl. Thamrin No. 456, Jakarta',
        isActive: true,
      },
      {
        name: 'Toko Alat Tulis Sejahtera',
        contact: 'Ahmad Wijaya',
        phone: '021-11223344',
        email: 'ahmad@alattulis.com',
        address: 'Jl. Gatot Subroto No. 789, Jakarta',
        isActive: true,
      },
      {
        name: 'PT Food Supplier Indonesia',
        contact: 'Dewi Lestari',
        phone: '021-99887766',
        email: 'dewi@foodsupplier.com',
        address: 'Jl. HR Rasuna Said No. 321, Jakarta',
        isActive: true,
      },
    ];

    const existingSuppliers = await queryInterface.sequelize.query(
      'SELECT name FROM suppliers',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set(existingSuppliers.map((supplier) => supplier.name));
    const suppliersToInsert = suppliers
      .filter((supplier) => !existingNames.has(supplier.name))
      .map((supplier) => ({
        id: uuidv4(),
        ...supplier,
        createdAt: now,
        updatedAt: now,
      }));

    if (suppliersToInsert.length > 0) {
      await queryInterface.bulkInsert('suppliers', suppliersToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('suppliers', null, {});
  },
};
