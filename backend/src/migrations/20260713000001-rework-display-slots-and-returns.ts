import { DataTypes, QueryInterface } from 'sequelize';

async function hasColumn(queryInterface: QueryInterface, tableName: string, columnName: string) {
  const desc = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(desc, columnName);
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('display_products')) {
      if (!(await hasColumn(queryInterface, 'display_products', 'productId'))) {
        await queryInterface.addColumn('display_products', 'productId', {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        await queryInterface.addIndex('display_products', ['productId'], { unique: true });
      }

      if (!(await hasColumn(queryInterface, 'display_products', 'slotLimit'))) {
        await queryInterface.addColumn('display_products', 'slotLimit', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        });
      }
    }

    if (!tables.includes('display_returns')) {
      await queryInterface.createTable('display_returns', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        letterNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        letterSequence: { type: DataTypes.INTEGER, allowNull: false },
        letterMonth: { type: DataTypes.INTEGER, allowNull: false },
        letterYear: { type: DataTypes.INTEGER, allowNull: false },
        letterDate: { type: DataTypes.DATEONLY, allowNull: false },
        recipientName: { type: DataTypes.STRING(255), allowNull: false },
        recipientAddress: { type: DataTypes.TEXT, allowNull: false },
        carriedBy: { type: DataTypes.STRING(255), allowNull: true },
        status: { type: DataTypes.ENUM('DRAFT', 'READY_TO_SEND', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'), allowNull: false, defaultValue: 'DRAFT' },
        notes: { type: DataTypes.TEXT, allowNull: true },
        createdBy: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        sentBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        sentAt: { type: DataTypes.DATE, allowNull: true },
        receivedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        receivedAt: { type: DataTypes.DATE, allowNull: true },
        completedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_returns', ['letterMonth', 'letterYear']);
      await queryInterface.addIndex('display_returns', ['status']);
    }

    if (!tables.includes('display_return_items')) {
      await queryInterface.createTable('display_return_items', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        displayReturnId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_returns', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        displayProductId: { type: DataTypes.UUID, allowNull: false, references: { model: 'display_products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        productVariantId: { type: DataTypes.UUID, allowNull: true, references: { model: 'product_variants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        skuSnapshot: { type: DataTypes.STRING(100), allowNull: false },
        productNameSnapshot: { type: DataTypes.STRING(255), allowNull: false },
        variantSnapshot: { type: DataTypes.STRING(255), allowNull: true },
        quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        condition: { type: DataTypes.STRING(100), allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: false },
        notes: { type: DataTypes.TEXT, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('display_return_items', ['displayReturnId']);
      await queryInterface.addIndex('display_return_items', ['displayProductId']);
      await queryInterface.addIndex('display_return_items', ['productId']);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('display_return_items');
    await queryInterface.dropTable('display_returns');
    const tables = await queryInterface.showAllTables();
    if (tables.includes('display_products')) {
      if (await hasColumn(queryInterface, 'display_products', 'slotLimit')) await queryInterface.removeColumn('display_products', 'slotLimit');
      if (await hasColumn(queryInterface, 'display_products', 'productId')) await queryInterface.removeColumn('display_products', 'productId');
    }
  },
};
