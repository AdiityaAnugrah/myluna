
import { User } from '../models';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log('DB Connection OK');

    const username = 'user';
    const user = await User.findOne({ where: { username } });

    if (!user) {
      console.log(`❌ User '${username}' NOT FOUND in database.`);
    } else {
      console.log(`✅ User found: ID=${user.id}, RoleID=${user.roleId}, Active=${user.isActive}`);
      console.log(`   Stored Hash: ${user.password}`);
      
      const isMatch = await bcrypt.compare('admin123', user.password);
      console.log(`   Password 'admin123' Match: ${isMatch ? 'YES ✅' : 'NO ❌'}`);
    }

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
