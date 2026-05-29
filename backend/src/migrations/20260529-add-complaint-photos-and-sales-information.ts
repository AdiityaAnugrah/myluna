import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('complaints');

    if (!table.complaintPhotos) {
      await queryInterface.addColumn('complaints', 'complaintPhotos', {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }

    if (!table.salesInformation) {
      await queryInterface.addColumn('complaints', 'salesInformation', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!table.complaintReceiptPdf) {
      await queryInterface.addColumn('complaints', 'complaintReceiptPdf', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
    }

    if (!table.complaintVideo) {
      await queryInterface.addColumn('complaints', 'complaintVideo', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
    }

    if (!table.complaintVideoOriginalSize) {
      await queryInterface.addColumn('complaints', 'complaintVideoOriginalSize', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    if (!table.complaintVideoCompressedSize) {
      await queryInterface.addColumn('complaints', 'complaintVideoCompressedSize', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('complaints');

    if (table.complaintPhotos) {
      await queryInterface.removeColumn('complaints', 'complaintPhotos');
    }

    if (table.salesInformation) {
      await queryInterface.removeColumn('complaints', 'salesInformation');
    }

    if (table.complaintReceiptPdf) {
      await queryInterface.removeColumn('complaints', 'complaintReceiptPdf');
    }

    if (table.complaintVideo) {
      await queryInterface.removeColumn('complaints', 'complaintVideo');
    }

    if (table.complaintVideoOriginalSize) {
      await queryInterface.removeColumn('complaints', 'complaintVideoOriginalSize');
    }

    if (table.complaintVideoCompressedSize) {
      await queryInterface.removeColumn('complaints', 'complaintVideoCompressedSize');
    }
  },
};
