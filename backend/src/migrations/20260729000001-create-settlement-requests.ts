import { DataTypes, QueryInterface } from 'sequelize';

async function hasTable(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (await hasTable(queryInterface, 'settlement_requests')) return;

    await queryInterface.createTable('settlement_requests', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      sale_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'sales',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      invoice_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      net_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      settlement_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      proof_document: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      requested_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      settlement_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'settlements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('settlement_requests', ['sale_id', 'status'], {
      name: 'settlement_requests_sale_status_idx',
    });
    await queryInterface.addIndex('settlement_requests', ['requested_by'], {
      name: 'settlement_requests_requested_by_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    if (await hasTable(queryInterface, 'settlement_requests')) {
      await queryInterface.dropTable('settlement_requests');
    }
  },
};
