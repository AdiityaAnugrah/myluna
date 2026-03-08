
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { User, Role } from './models';
import { sequelize } from './config/database';

async function findTCPUser() {
  try {
    await sequelize.authenticate();
    const tcpUser = await User.findOne({
      include: [{
        model: Role,
        as: 'role',
        where: { name: 'TCP' }
      }]
    });

    if (tcpUser) {
      console.log(`TCP_USER_ID: ${tcpUser.id}`);
      console.log(`TCP_USERNAME: ${tcpUser.username}`);
    } else {
      console.log('TCP_USER_NOT_FOUND');
    }
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await sequelize.close();
  }
}

findTCPUser();
