import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (!(await tableExists(queryInterface, 'provinsi'))) {
      await queryInterface.createTable('provinsi', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
        },
        label: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
      });
    }

    if (!(await tableExists(queryInterface, 'kabupaten'))) {
      await queryInterface.createTable('kabupaten', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
        },
        provinsi_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'provinsi',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        label: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
      });
      await queryInterface.addIndex('kabupaten', ['provinsi_id']);
    }

    if (!(await tableExists(queryInterface, 'kecamatan'))) {
      await queryInterface.createTable('kecamatan', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
        },
        provinsi_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'provinsi',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        kabupaten_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kabupaten',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        label: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
      });
      await queryInterface.addIndex('kecamatan', ['provinsi_id']);
      await queryInterface.addIndex('kecamatan', ['kabupaten_id']);
    }

    if (!(await tableExists(queryInterface, 'kelurahan'))) {
      await queryInterface.createTable('kelurahan', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true,
        },
        provinsi_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'provinsi',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        kabupaten_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kabupaten',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        kecamatan_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kecamatan',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        label: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        kodepos: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
      });
      await queryInterface.addIndex('kelurahan', ['provinsi_id']);
      await queryInterface.addIndex('kelurahan', ['kabupaten_id']);
      await queryInterface.addIndex('kelurahan', ['kecamatan_id']);
      await queryInterface.addIndex('kelurahan', ['kodepos']);
    }

    const salesTable = await queryInterface.describeTable('sales');

    if (!salesTable.shippingProvinceId) {
      await queryInterface.addColumn('sales', 'shippingProvinceId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'provinsi',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('sales', ['shippingProvinceId']);
    }

    if (!salesTable.shippingRegencyId) {
      await queryInterface.addColumn('sales', 'shippingRegencyId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'kabupaten',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('sales', ['shippingRegencyId']);
    }

    if (!salesTable.shippingDistrictId) {
      await queryInterface.addColumn('sales', 'shippingDistrictId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'kecamatan',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('sales', ['shippingDistrictId']);
    }

    if (!salesTable.shippingVillageId) {
      await queryInterface.addColumn('sales', 'shippingVillageId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'kelurahan',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('sales', ['shippingVillageId']);
    }

    if (!salesTable.shippingPostalCode) {
      await queryInterface.addColumn('sales', 'shippingPostalCode', {
        type: DataTypes.STRING(10),
        allowNull: true,
      });
      await queryInterface.addIndex('sales', ['shippingPostalCode']);
    }

    if (!salesTable.shippingAddressDetail) {
      await queryInterface.addColumn('sales', 'shippingAddressDetail', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const salesTable = await queryInterface.describeTable('sales');

    if (salesTable.shippingAddressDetail) await queryInterface.removeColumn('sales', 'shippingAddressDetail');
    if (salesTable.shippingPostalCode) await queryInterface.removeColumn('sales', 'shippingPostalCode');
    if (salesTable.shippingVillageId) await queryInterface.removeColumn('sales', 'shippingVillageId');
    if (salesTable.shippingDistrictId) await queryInterface.removeColumn('sales', 'shippingDistrictId');
    if (salesTable.shippingRegencyId) await queryInterface.removeColumn('sales', 'shippingRegencyId');
    if (salesTable.shippingProvinceId) await queryInterface.removeColumn('sales', 'shippingProvinceId');

    if (await tableExists(queryInterface, 'kelurahan')) await queryInterface.dropTable('kelurahan');
    if (await tableExists(queryInterface, 'kecamatan')) await queryInterface.dropTable('kecamatan');
    if (await tableExists(queryInterface, 'kabupaten')) await queryInterface.dropTable('kabupaten');
    if (await tableExists(queryInterface, 'provinsi')) await queryInterface.dropTable('provinsi');
  },
};
