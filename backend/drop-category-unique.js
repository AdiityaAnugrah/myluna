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
    // Check for any unique indexes on categories.name
    const [indexes] = await s.query("SHOW INDEX FROM categories WHERE Column_name='name' AND Non_unique=0");
    console.log('Indexes found:', JSON.stringify(indexes));
    
    for (const idx of indexes) {
      const keyName = idx.Key_name;
      if (keyName !== 'PRIMARY') {
        console.log(`Dropping index: ${keyName}`);
        await s.query(`ALTER TABLE categories DROP INDEX \`${keyName}\``);
        console.log('Dropped!');
      }
    }
    console.log('Done.');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await s.close();
  }
}
run();
