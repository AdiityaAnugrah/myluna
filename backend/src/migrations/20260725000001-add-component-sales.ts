import { DataTypes, QueryInterface } from 'sequelize';

async function hasColumn(queryInterface: QueryInterface, tableName: string, columnName: string) {
  const table = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, columnName);
}

async function addColumnIfMissing(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  attributes: Parameters<QueryInterface['addColumn']>[2]
) {
  if (!(await hasColumn(queryInterface, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, attributes);
  }
}

async function removeColumnIfExists(queryInterface: QueryInterface, tableName: string, columnName: string) {
  if (await hasColumn(queryInterface, tableName, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, 'sales', 'sale_type', {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PRODUCT',
    });

    await addColumnIfMissing(queryInterface, 'sale_items', 'item_type', {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PRODUCT',
    });
    await addColumnIfMissing(queryInterface, 'sale_items', 'component_name', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'sale_items', 'component_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    const saleItems = await queryInterface.describeTable('sale_items');
    if (saleItems.productId && saleItems.productId.allowNull === false) {
      await queryInterface.changeColumn('sale_items', 'productId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`UPDATE sale_items SET productId = NULL WHERE item_type = 'COMPONENT'`);
    await removeColumnIfExists(queryInterface, 'sale_items', 'component_notes');
    await removeColumnIfExists(queryInterface, 'sale_items', 'component_name');
    await removeColumnIfExists(queryInterface, 'sale_items', 'item_type');
    await removeColumnIfExists(queryInterface, 'sales', 'sale_type');
  },
};
