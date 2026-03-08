
import { authService } from '../services/auth.service';
import { sequelize } from '../config/database';

async function testLogin() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.');

    const credentials = ['user', 'staff', 'admin'];
    const password = 'admin123';

    for (const cred of credentials) {
      console.log(`Testing login for: ${cred}`);
      try {
        const result = await authService.login(cred, password);
        console.log(`✅ Login SUCCESS for ${cred}! User ID: ${result.user.id}, Role: ${result.user.role}`);
      } catch (error: any) {
        console.error(`❌ Login FAILED for ${cred}: ${error.message}`);
      }
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await sequelize.close();
  }
}

testLogin();
