import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const [salesIndexes, saleItemIndexes, userIndexes, productIndexes] = await Promise.all([
      queryInterface.showIndex('sales'),
      queryInterface.showIndex('sale_items'),
      queryInterface.showIndex('users'),
      queryInterface.showIndex('products'),
    ]);

    const salesHasPrimaryKey = (salesIndexes as any[]).some((index: any) => index.primary);
    const saleItemsHasPrimaryKey = (saleItemIndexes as any[]).some((index: any) => index.primary);
    const usersHasPrimaryKey = (userIndexes as any[]).some((index: any) => index.primary);
    const productsHasPrimaryKey = (productIndexes as any[]).some((index: any) => index.primary);

    if (!(await tableExists(queryInterface, 'sale_returns'))) {
      await queryInterface.createTable('sale_returns', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        returnNumber: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        saleId: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(salesHasPrimaryKey
            ? {
                references: {
                  model: 'sales',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        requestedBy: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        reviewedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        receivedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        processedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: {
          type: DataTypes.ENUM(
            'PENDING_REVIEW',
            'WAITING_ITEM_RETURN',
            'ITEM_RECEIVED',
            'REJECTED',
            'RESTOCKED',
            'DAMAGED',
            'RESENT',
            'COMPLETED'
          ),
          allowNull: false,
          defaultValue: 'PENDING_REVIEW',
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        requestDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        receivedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        processedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        inspectionDecision: {
          type: DataTypes.ENUM('RESTOCK', 'DAMAGED', 'RESEND'),
          allowNull: true,
        },
        inspectionNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        resendShippingService: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        resendShippingCost: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        financialImpactAmount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        evidencePhotos: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        receivedPhotos: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        rejectionReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('sale_returns', ['saleId']);
      await queryInterface.addIndex('sale_returns', ['requestedBy']);
      await queryInterface.addIndex('sale_returns', ['status']);
    }

    if (!(await tableExists(queryInterface, 'sale_return_items'))) {
      await queryInterface.createTable('sale_return_items', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        returnId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'sale_returns',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        saleItemId: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(saleItemsHasPrimaryKey
            ? {
                references: {
                  model: 'sale_items',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(productsHasPrimaryKey
            ? {
                references: {
                  model: 'products',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        variantName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        qtySold: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        qtyRequested: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        qtyReceived: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        resolution: {
          type: DataTypes.ENUM('RESTOCK', 'DAMAGED', 'RESEND'),
          allowNull: true,
        },
        replacementProductId: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(productsHasPrimaryKey
            ? {
                references: {
                  model: 'products',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        replacementVariantName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        replacementQty: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('sale_return_items', ['returnId']);
      await queryInterface.addIndex('sale_return_items', ['saleItemId']);
      await queryInterface.addIndex('sale_return_items', ['productId']);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'sale_return_items')) {
      await queryInterface.dropTable('sale_return_items');
    }
    if (await tableExists(queryInterface, 'sale_returns')) {
      await queryInterface.dropTable('sale_returns');
    }
  },
};
