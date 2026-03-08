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
    // Show all categories including inactive
    const [all] = await s.query('SELECT id, name, isActive FROM categories');
    console.log('All categories:', JSON.stringify(all));

    // Delete soft-deleted (isActive=0) ones
    const [result] = await s.query('DELETE FROM categories WHERE isActive = 0');
    console.log('Deleted inactive categories:', result.affectedRows);
    
    const [remaining] = await s.query('SELECT name, isActive FROM categories');
    console.log('Remaining:', JSON.stringify(remaining));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await s.close();
  }
}
run();
