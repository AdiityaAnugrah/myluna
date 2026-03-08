import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('settlements', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sale_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'sales',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add index for faster lookups
    await queryInterface.addIndex('settlements', ['sale_id']);
    await queryInterface.addIndex('settlements', ['settlement_date']);
    await queryInterface.addIndex('settlements', ['created_by']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('settlements');
  },
};
