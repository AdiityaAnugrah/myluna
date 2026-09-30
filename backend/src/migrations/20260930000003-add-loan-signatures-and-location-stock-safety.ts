import { DataTypes, QueryInterface } from 'sequelize';

async function columnExists(queryInterface: QueryInterface, table: string, column: string) {
  const desc = await queryInterface.describeTable(table).catch(() => null as any);
  return !!desc?.[column];
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('inventory_loans')) {
      if (!(await columnExists(queryInterface, 'inventory_loans', 'submitted_signature'))) {
        await queryInterface.addColumn('inventory_loans', 'submitted_signature', { type: DataTypes.TEXT('long'), allowNull: true });
      }
      if (!(await columnExists(queryInterface, 'inventory_loans', 'acknowledged_signature'))) {
        await queryInterface.addColumn('inventory_loans', 'acknowledged_signature', { type: DataTypes.TEXT('long'), allowNull: true });
      }
      if (!(await columnExists(queryInterface, 'inventory_loans', 'received_signature'))) {
        await queryInterface.addColumn('inventory_loans', 'received_signature', { type: DataTypes.TEXT('long'), allowNull: true });
      }
    }

    if (!tables.includes('product_location_stocks')) {
      await queryInterface.createTable('product_location_stocks', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        variant_name: { type: DataTypes.STRING(255), allowNull: true },
        location: { type: DataTypes.ENUM('CENTER'), allowNull: false, defaultValue: 'CENTER' },
        stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
    }

    await queryInterface
      .addIndex('product_location_stocks', ['product_id', 'variant_name', 'location'], {
        name: 'product_location_stocks_unique_idx',
        unique: true,
      })
      .catch(() => {});
  },

  down: async () => {},
};
