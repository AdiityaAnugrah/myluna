import { sequelize } from './src/config/database';

(async () => {
  try {
    await sequelize.query(
      "ALTER TABLE change_requests MODIFY COLUMN entityType ENUM('PRODUCT','CATEGORY','SUPPLIER','STOCK','SETTLEMENT','SALE') NOT NULL"
    );
    console.log('Added SALE to entityType enum');
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  await sequelize.close();
})();
