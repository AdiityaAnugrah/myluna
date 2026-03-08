
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'luna_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log(`Generated Hash for '${password}': ${hash}`);

    const targets = ['staff@luna.com', 'user@luna.com', 'admin@luna.com'];
    
    // Direct raw update to ensure no hook interference
    const [results, metadata] = await sequelize.query(
      `UPDATE users SET password = '${hash}' WHERE email IN (:emails)`,
      {
        replacements: { emails: targets }
      }
    );

    console.log('✅ Update executed.');
    console.log('Metadata:', metadata);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

fix();
