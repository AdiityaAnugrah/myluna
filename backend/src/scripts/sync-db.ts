import { sequelize } from '../config/database';
import * as Models from '../models'; // Import all models to register them
import { logger } from '../utils/logger';

async function syncDatabase() {
  try {
    logger.info('🔄 Starting Database Synchronization...');
    
    // 1. Authenticate
    await sequelize.authenticate();
    logger.info('✅ Database connected.');

    // 2. Sync models (create tables if they don't exist)
    // Accessing Models to ensure they are registered and avoid unused variable error
    const modelCount = Object.keys(Models).length;
    logger.info(`📦 Registered ${modelCount} models.`);
    
    // NOTE: alter: true will try to update existing tables to match models
    await sequelize.sync({ force: false, alter: true });
    logger.info('✅ Tables synchronized based on models.');

    // 3. Mark existing migrations as completed in SequelizeMeta
    // This prevents "addColumn" errors if we run npx sequelize-cli db:migrate later
    const migrations = [
      '20260213-add-processed-at-to-sales.ts',
      '20260213-create-settlements.ts',
      '20260311-create-variant-options.ts'
    ];

    // Create SequelizeMeta table if it doesn't exist
    await sequelize.query('CREATE TABLE IF NOT EXISTS `SequelizeMeta` (`name` VARCHAR(255) NOT NULL PRIMARY KEY) ENGINE=InnoDB;');

    for (const migration of migrations) {
      const [results]: any = await sequelize.query(
        `SELECT name FROM SequelizeMeta WHERE name = :name`,
        { replacements: { name: migration } }
      );

      if (results.length === 0) {
        await sequelize.query(
          `INSERT INTO SequelizeMeta (name) VALUES (:name)`,
          { replacements: { name: migration } }
        );
        logger.info(`✅ Marked migration as done: ${migration}`);
      }
    }

    logger.info('🎉 Database initialization complete!');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Database synchronization failed:', error.message);
    process.exit(1);
  }
}

syncDatabase();
