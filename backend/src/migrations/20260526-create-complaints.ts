import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('complaints')) return;

    const [salesIndexes, userIndexes] = await Promise.all([
      queryInterface.showIndex('sales'),
      queryInterface.showIndex('users'),
    ]);
    const salesHasPrimaryKey = (salesIndexes as any[]).some((index: any) => index.primary);
    const usersHasPrimaryKey = (userIndexes as any[]).some((index: any) => index.primary);

    await queryInterface.createTable('complaints', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      complaintNumber: {
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
      saleNumberSnapshot: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      customerNameSnapshot: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      complaintDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      complaintPhoto: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      complaintPhotos: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      salesInformation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      complaintReceiptPdf: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      complaintVideo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      complaintVideoOriginalSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      complaintVideoCompressedSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          'PENDING_TCP_REVIEW',
          'REJECTED_BY_TCP',
          'ACCEPTED_BY_TCP',
          'REPLACEMENT_SHIPPED'
        ),
        allowNull: false,
        defaultValue: 'PENDING_TCP_REVIEW',
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
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      replacementProofDocument: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      shippedBy: {
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
      },
      shippedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdBy: {
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

    await queryInterface.addIndex('complaints', ['saleId']);
    await queryInterface.addIndex('complaints', ['status']);
    await queryInterface.addIndex('complaints', ['createdBy']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('complaints');
  },
};
