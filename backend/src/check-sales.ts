
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { User, Role } from './models';
import { sequelize } from './config/database';

async function checkDetails() {
  try {
    await sequelize.authenticate();
    
    const roles = await Role.findAll();
    console.log('--- ROLES ---');
    roles.forEach(r => {
      console.log(`RoleName: [${r.name}] (length: ${r.name.length})`);
    });

    const risky = await User.findOne({ 
      where: { username: 'risky' },
      include: [{ model: Role, as: 'role' }]
    });

    if (risky) {
      console.log(`\nUser: risky`);
      console.log(`Role assigned: [${(risky as any).role?.name}]`);
      console.log(`RoleID in user: ${risky.roleId}`);
      console.log(`RoleID in role: ${(risky as any).role?.id}`);
    }

  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await sequelize.close();
  }
}

checkDetails();
