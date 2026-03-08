
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

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const users = ['user', 'staff', 'admin'];
    
    for (const username of users) {
        const [results] = await sequelize.query(
            `SELECT * FROM users WHERE username = '${username}' OR email = '${username}@luna.com' LIMIT 1`
        );
        
        if (results.length === 0) {
            console.log(`❌ User '${username}' NOT FOUND in DB.`);
            continue;
        }

        const user = results[0];
        console.log(`Found user: ${user.username} (ID: ${user.id})`);
        console.log(`Stored Hash: ${user.password.substring(0, 15)}...`);

        const isMatch = await bcrypt.compare('admin123', user.password);
        console.log(`Testing 'admin123': ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

test();
