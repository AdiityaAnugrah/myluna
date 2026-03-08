
import { User } from './models';
import { sequelize } from './config/database';
import bcrypt from 'bcrypt';

async function resetPasswords() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const targets = ['user', 'staff', 'admin'];
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    for (const username of targets) {
      const user = await User.findOne({ where: { username } });
      if (user) {
        // We update directly via query to avoid hooks potentially double-hashing if we used .save() incorrectly
        // But here we want to be sure. Let's use the model update but ensure we pass the raw hash if using bulkUpdate mechanism, 
        // OR better, just use user.update passing the raw string if the hook handles it.
        // Wait, the User model hook hashes on beforeUpdate if 'password' changed.
        
        // Approach: pass PLAIN text 'admin123' and let the hook hash it. 
        // This confirms the model hook logic works for future app usage too.
        user.password = newPassword;
        await user.save(); 
        console.log(`✅ Reset password for '${username}' to '${newPassword}'`);
      } else {
        console.log(`⚠️ User '${username}' not found.`);
      }
    }

  } catch (error) {
    console.error('Reset failed:', error);
  } finally {
    await sequelize.close();
  }
}

resetPasswords();
