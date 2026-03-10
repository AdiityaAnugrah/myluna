import { sequelize } from './src/config/database';
import { ChangeRequest, User } from './src/models';
import { changeRequestController } from './src/controllers/changeRequest.controller';

async function test() {
  console.log('Starting test...');
  await sequelize.authenticate();
  console.log('Auth OK');
  
  const req: any = {
    params: { id: 'fb43cbd3-5e37-4bf6-b2ba-bc6916a91325' },
    user: { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed' }
  };
  const res: any = {
    status: (code: number) => { console.log('Status called:', code); return res; },
    json: (data: any) => console.log('JSON Output:', JSON.stringify(data, null, 2))
  };
  const next = (err: any) => { console.error('Next called with error:', err); };

  console.log('Fetching super admin...');
  const admin = await User.findOne({ where: { roleId: 1 } });
  if (admin) {
     req.user.id = admin.id;
     console.log('Using admin:', admin.id);
  }

  console.log('Calling approve...');
  await changeRequestController.approve(req, res, next);
  console.log('Approve done.');
}
test().catch(err => { console.error('Fatal:', err); }).finally(() => process.exit(0));
