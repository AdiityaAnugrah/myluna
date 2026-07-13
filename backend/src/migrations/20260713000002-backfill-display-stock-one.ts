import { QueryInterface, QueryTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('display_products')) return;

    const productRows = await queryInterface.sequelize.query<any>(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.description,
          p.categoryId,
          p.unit,
          p.sellingPrice
        FROM products p
        LEFT JOIN display_products dp ON dp.productId = p.id
        WHERE p.isActive = 1
          AND dp.id IS NULL
      `,
      { type: QueryTypes.SELECT }
    );

    for (const product of productRows) {
      await queryInterface.bulkInsert('display_products', [
        {
          id: queryInterface.sequelize.literal('UUID()') as unknown as string,
          productId: product.id,
          sku: `DSP-${product.sku}`.slice(0, 80),
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          supplierId: null,
          displayLocation: null,
          unit: product.unit || 'pcs',
          stock: 1,
          minStock: 0,
          slotLimit: 1,
          estimatedValue: product.sellingPrice || 0,
          condition: 'GOOD',
          status: 'DISPLAYED',
          notes: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }

    await queryInterface.sequelize.query(`
      UPDATE display_products
      SET stock = 1,
          slotLimit = 1,
          status = 'DISPLAYED',
          updatedAt = NOW()
      WHERE isActive = 1
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('display_products')) return;
    const desc = await queryInterface.describeTable('display_products');
    if (!Object.prototype.hasOwnProperty.call(desc, 'slotLimit')) return;
    await queryInterface.sequelize.query(`
      UPDATE display_products
      SET stock = 0,
          status = 'STORED',
          updatedAt = NOW()
      WHERE isActive = 1
    `);
  },
};
