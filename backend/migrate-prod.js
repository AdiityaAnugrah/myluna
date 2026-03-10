const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize connection using production details
const sequelize = new Sequelize(
  process.env.DB_NAME || 'luna_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: console.log,
  }
);

async function addMissingColumns() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful.');

    // Add isInitialBalance to target table (sales)
    console.log('Adding isInitialBalance column to sales...');
    const queryInterface = sequelize.getQueryInterface();

    const tableDescription = await queryInterface.describeTable('sales');
    
    if (!tableDescription.isInitialBalance) {
        await queryInterface.addColumn('sales', 'isInitialBalance', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
        console.log('`isInitialBalance` added to `sales` successfully.');
    } else {
        console.log('`isInitialBalance` already exists in `sales`. Skipping.');
    }

    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addMissingColumns();
