'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    // Get category IDs
    const [categories] = await queryInterface.sequelize.query(
      "SELECT id, name FROM categories"
    );
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    
    const products = [
      // Electronics
      {
        sku: 'ELEC-001',
        name: 'Laptop Dell Inspiron 15',
        description: '15.6" FHD, Intel Core i5, 8GB RAM, 512GB SSD',
        categoryId: categoryMap['Electronics'],
        unit: 'pcs',
        purchasePrice: 8500000,
        sellingPrice: 10500000,
        stock: 15,
        minStock: 5,
        isActive: true,
      },
      {
        sku: 'ELEC-002',
        name: 'Mouse Logitech M185',
        description: 'Wireless mouse with USB receiver',
        categoryId: categoryMap['Electronics'],
        unit: 'pcs',
        purchasePrice: 85000,
        sellingPrice: 125000,
        stock: 50,
        minStock: 10,
        isActive: true,
      },
      {
        sku: 'ELEC-003',
        name: 'Keyboard Mechanical RGB',
        description: 'Gaming keyboard with RGB backlight',
        categoryId: categoryMap['Electronics'],
        unit: 'pcs',
        purchasePrice: 450000,
        sellingPrice: 650000,
        stock: 3,
        minStock: 5,
        isActive: true,
      },
      // Furniture
      {
        sku: 'FURN-001',
        name: 'Office Chair Ergonomic',
        description: 'Adjustable ergonomic office chair with lumbar support',
        categoryId: categoryMap['Furniture'],
        unit: 'pcs',
        purchasePrice: 1200000,
        sellingPrice: 1800000,
        stock: 8,
        minStock: 3,
        isActive: true,
      },
      {
        sku: 'FURN-002',
        name: 'Standing Desk Adjustable',
        description: 'Height adjustable standing desk 120x60cm',
        categoryId: categoryMap['Furniture'],
        unit: 'pcs',
        purchasePrice: 2500000,
        sellingPrice: 3500000,
        stock: 5,
        minStock: 2,
        isActive: true,
      },
      // Stationery
      {
        sku: 'STAT-001',
        name: 'Ballpoint Pen Blue',
        description: 'Blue ballpoint pen, pack of 12',
        categoryId: categoryMap['Stationery'],
        unit: 'pack',
        purchasePrice: 15000,
        sellingPrice: 25000,
        stock: 100,
        minStock: 20,
        isActive: true,
      },
      {
        sku: 'STAT-002',
        name: 'A4 Paper 80gsm',
        description: 'White A4 paper, 500 sheets per ream',
        categoryId: categoryMap['Stationery'],
        unit: 'ream',
        purchasePrice: 35000,
        sellingPrice: 50000,
        stock: 200,
        minStock: 50,
        isActive: true,
      },
      {
        sku: 'STAT-003',
        name: 'Stapler Heavy Duty',
        description: 'Heavy duty stapler, can staple up to 50 sheets',
        categoryId: categoryMap['Stationery'],
        unit: 'pcs',
        purchasePrice: 75000,
        sellingPrice: 120000,
        stock: 25,
        minStock: 10,
        isActive: true,
      },
      // Food & Beverage
      {
        sku: 'FOOD-001',
        name: 'Instant Coffee 3-in-1',
        description: 'Instant coffee mix, box of 20 sachets',
        categoryId: categoryMap['Food & Beverage'],
        unit: 'box',
        purchasePrice: 25000,
        sellingPrice: 35000,
        stock: 150,
        minStock: 30,
        isActive: true,
      },
      {
        sku: 'FOOD-002',
        name: 'Mineral Water 600ml',
        description: 'Bottled mineral water, pack of 24',
        categoryId: categoryMap['Food & Beverage'],
        unit: 'pack',
        purchasePrice: 35000,
        sellingPrice: 50000,
        stock: 80,
        minStock: 20,
        isActive: true,
      },
    ];

    const existingProducts = await queryInterface.sequelize.query(
      'SELECT sku FROM products',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingSkus = existingProducts.map(p => p.sku);

    const productsToInsert = products
      .filter(p => !existingSkus.includes(p.sku))
      .map(p => ({
        id: uuidv4(),
        ...p,
        createdAt: now,
        updatedAt: now,
      }));

    if (productsToInsert.length > 0) {
      await queryInterface.bulkInsert('products', productsToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {});
  },
};
