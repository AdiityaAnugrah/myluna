import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('inventory_loans')) {
      await queryInterface.createTable('inventory_loans', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        loan_number: {
          type: DataTypes.STRING(40),
          allowNull: false,
          unique: true,
        },
        direction: {
          type: DataTypes.ENUM('TO_CENTER', 'FROM_CENTER'),
          allowNull: false,
        },
        loan_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        borrower_name: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        target_name: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        submitted_signature_name: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        submitted_signature: {
          type: DataTypes.TEXT('long'),
          allowNull: true,
        },
        acknowledged_signature_name: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        acknowledged_signature: {
          type: DataTypes.TEXT('long'),
          allowNull: true,
        },
        received_signature_name: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        received_signature: {
          type: DataTypes.TEXT('long'),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('BORROWED', 'RETURNED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'BORROWED',
        },
        returned_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        returned_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        return_notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
    }

    if (!tables.includes('inventory_loan_items')) {
      await queryInterface.createTable('inventory_loan_items', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        loan_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'inventory_loans',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        variant_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        condition: {
          type: DataTypes.ENUM('GOOD', 'MINOR_DAMAGE', 'DAMAGED', 'OTHER'),
          allowNull: false,
          defaultValue: 'GOOD',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
    }

    await queryInterface.addIndex('inventory_loans', ['status'], { name: 'inventory_loans_status_idx' }).catch(() => {});
    await queryInterface.addIndex('inventory_loans', ['direction'], { name: 'inventory_loans_direction_idx' }).catch(() => {});
    await queryInterface.addIndex('inventory_loan_items', ['product_id'], { name: 'inventory_loan_items_product_idx' }).catch(() => {});

    if (!tables.includes('product_location_stocks')) {
      await queryInterface.createTable('product_location_stocks', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        variant_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        location: {
          type: DataTypes.ENUM('CENTER'),
          allowNull: false,
          defaultValue: 'CENTER',
        },
        stock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
    }
    await queryInterface
      .addIndex('product_location_stocks', ['product_id', 'variant_name', 'location'], {
        name: 'product_location_stocks_unique_idx',
        unique: true,
      })
      .catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('product_location_stocks')) await queryInterface.dropTable('product_location_stocks');
    if (tables.includes('inventory_loan_items')) await queryInterface.dropTable('inventory_loan_items');
    if (tables.includes('inventory_loans')) await queryInterface.dropTable('inventory_loans');
  },
};
