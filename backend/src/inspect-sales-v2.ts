
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Sale } from './models';
import { sequelize } from './config/database';

async function checkSales() {
  try {
    await sequelize.authenticate();
    console.log('DB Connection OK');

    const sales = await Sale.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log('\n--- SALES DATA ---');
    sales.forEach((s: any) => {
      console.log(`Inv: ${s.saleNumber} | Shipping: [${s.shippingService}] | Status: ${s.status}`);
    });

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await sequelize.close();
  }
}

checkSales();
