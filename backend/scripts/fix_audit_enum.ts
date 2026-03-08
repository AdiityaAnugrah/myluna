
import { sequelize } from '../src/config/database';

async function fixEnum() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected.');

    console.log('Altering audit_logs table to update action enum...');
    const query = `
      ALTER TABLE audit_logs 
      MODIFY COLUMN action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT') NOT NULL;
    `;
    
    await sequelize.query(query);
    console.log('Successfully updated ENUM column.');

  } catch (error) {
    console.error('Error updating enum:', error);
  } finally {
    await sequelize.close();
  }
}

fixEnum();
