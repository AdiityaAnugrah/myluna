
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { User, Role } from './models';
import { sequelize } from './config/database';

async function listUsers() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({
      include: [{ model: Role, as: 'role' }]
    });
    console.log('--- ALL USERS ---');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Username: ${u.username} | Role: ${(u as any).role?.name}`);
    });
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await sequelize.close();
  }
}

listUsers();
