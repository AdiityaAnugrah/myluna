import { User } from '../models';

async function checkUsers() {
  try {
    const users = await User.findAll();
    console.log(`User count: ${users.length}`);
    users.forEach(u => console.log(`- ${u.username} (${u.email}) - Active: ${u.isActive}`));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkUsers();
