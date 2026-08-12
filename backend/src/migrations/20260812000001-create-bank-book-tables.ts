import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('bank_book_entries')) {
      await queryInterface.createTable('bank_book_entries', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        bank_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        start_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        end_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        bank_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
        },
        selected_total: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
        },
        difference_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: DataTypes.ENUM('MATCHED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'MATCHED',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        cancelled_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        cancel_reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      await queryInterface.addIndex('bank_book_entries', ['start_date', 'end_date']);
      await queryInterface.addIndex('bank_book_entries', ['created_by']);
    }

    if (!tables.includes('bank_book_entry_items')) {
      await queryInterface.createTable('bank_book_entry_items', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        entry_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'bank_book_entries', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        settlement_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: { model: 'settlements', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        sale_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'sales', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        invoice_number: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        platform: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        gross_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
        },
        net_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
        },
        difference_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
        },
        settlement_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      await queryInterface.addIndex('bank_book_entry_items', ['entry_id']);
      await queryInterface.addIndex('bank_book_entry_items', ['settlement_id'], { unique: true });
      await queryInterface.addIndex('bank_book_entry_items', ['platform']);
      await queryInterface.addIndex('bank_book_entry_items', ['settlement_date']);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('bank_book_entry_items')) {
      await queryInterface.dropTable('bank_book_entry_items');
    }
    if (tables.includes('bank_book_entries')) {
      await queryInterface.dropTable('bank_book_entries');
    }
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_bank_book_entries_status").catch(() => undefined);
  },
};
