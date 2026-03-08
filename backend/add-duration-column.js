const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const s = new Sequelize(
  process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, dialect: 'mysql', logging: false }
);

async function run() {
  try {
    // Add duration column (seconds) to audit_logs
    await s.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS duration INT NULL COMMENT 'Duration in seconds from form open to submit'
    `);
    console.log('✅ Added duration column to audit_logs');
    
    // Add metadata column for extra tracking info
    await s.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS metadata JSON NULL COMMENT 'Extra tracking metadata'
    `);
    console.log('✅ Added metadata column to audit_logs');
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await s.close();
  }
}
run();
