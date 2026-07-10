import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    const userIndexes = await queryInterface.showIndex('users');
    const usersHasPrimaryKey = (userIndexes as any[]).some((index: any) => index.primary);

    if (!tables.includes('display_categories')) {
      await queryInterface.createTable('display_categories', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_categories', ['name']);
    }

    if (!tables.includes('display_suppliers')) {
      await queryInterface.createTable('display_suppliers', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        contact: { type: DataTypes.STRING(255), allowNull: true },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        email: { type: DataTypes.STRING(255), allowNull: true },
        address: { type: DataTypes.TEXT, allowNull: true },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_suppliers', ['name']);
    }

    if (!tables.includes('display_products')) {
      await queryInterface.createTable('display_products', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        sku: { type: DataTypes.STRING(80), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        categoryId: { type: DataTypes.UUID, allowNull: true, references: { model: 'display_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        supplierId: { type: DataTypes.UUID, allowNull: true, references: { model: 'display_suppliers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        displayLocation: { type: DataTypes.STRING(255), allowNull: true },
        unit: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pcs' },
        stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        minStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        estimatedValue: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
        condition: { type: DataTypes.ENUM('NEW', 'GOOD', 'MINOR_DAMAGE', 'DAMAGED'), allowNull: false, defaultValue: 'GOOD' },
        status: { type: DataTypes.ENUM('DISPLAYED', 'STORED', 'MAINTENANCE', 'DAMAGED', 'ARCHIVED'), allowNull: false, defaultValue: 'DISPLAYED' },
        notes: { type: DataTypes.TEXT, allowNull: true },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_products', ['sku']);
      await queryInterface.addIndex('display_products', ['name']);
      await queryInterface.addIndex('display_products', ['categoryId']);
      await queryInterface.addIndex('display_products', ['supplierId']);
    }

    if (!tables.includes('display_stock_movements')) {
      await queryInterface.createTable('display_stock_movements', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        type: { type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'), allowNull: false },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        stockBefore: { type: DataTypes.INTEGER, allowNull: false },
        stockAfter: { type: DataTypes.INTEGER, allowNull: false },
        reference: { type: DataTypes.STRING(255), allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(usersHasPrimaryKey
            ? { references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' }
            : {}),
        },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_stock_movements', ['productId']);
      await queryInterface.addIndex('display_stock_movements', ['createdAt']);
    }

    if (!tables.includes('display_stock_requests')) {
      await queryInterface.createTable('display_stock_requests', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        type: { type: DataTypes.ENUM('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'), allowNull: false },
        quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        targetStock: { type: DataTypes.INTEGER, allowNull: true },
        reason: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
        requestedBy: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(usersHasPrimaryKey
            ? { references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' }
            : {}),
        },
        reviewedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? { references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }
            : {}),
        },
        reviewedAt: { type: DataTypes.DATE, allowNull: true },
        rejectionReason: { type: DataTypes.TEXT, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_stock_requests', ['productId']);
      await queryInterface.addIndex('display_stock_requests', ['status']);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('display_stock_requests');
    await queryInterface.dropTable('display_stock_movements');
    await queryInterface.dropTable('display_products');
    await queryInterface.dropTable('display_suppliers');
    await queryInterface.dropTable('display_categories');
  },
};
