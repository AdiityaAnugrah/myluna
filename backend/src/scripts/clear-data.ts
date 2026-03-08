
import { sequelize } from '../config/database';

async function clearData() {
  const transaction = await sequelize.transaction();
  try {
    console.log('Clearing data...');
    // Disable foreign key checks to allow truncation
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

    await sequelize.query('TRUNCATE TABLE sale_items', { transaction });
    await sequelize.query('TRUNCATE TABLE sales', { transaction });
    await sequelize.query('TRUNCATE TABLE products', { transaction });
    // Optional: clear categories if you want a full reset, but import script checks for them.
    // await sequelize.query('TRUNCATE TABLE categories', { transaction }); 

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    
    await transaction.commit();
    console.log('Data cleared successfully.');
  } catch (error) {
    await transaction.rollback();
    console.error('Error clearing data:', error);
  } finally {
    await sequelize.close();
  }
}

clearData();
