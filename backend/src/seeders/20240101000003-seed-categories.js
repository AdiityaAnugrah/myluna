'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    const categories = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Furniture', description: 'Office and home furniture' },
      { name: 'Stationery', description: 'Office supplies and stationery items' },
      { name: 'Food & Beverage', description: 'Food and beverage products' },
      { name: 'Clothing', description: 'Apparel and accessories' },
    ];

    const existingCategories = await queryInterface.sequelize.query(
      'SELECT name FROM categories',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingNames = existingCategories.map(c => c.name);

    const categoriesToInsert = categories
      .filter(c => !existingNames.includes(c.name))
      .map(c => ({
        id: uuidv4(),
        ...c,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }));

    if (categoriesToInsert.length > 0) {
      await queryInterface.bulkInsert('categories', categoriesToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  },
};
