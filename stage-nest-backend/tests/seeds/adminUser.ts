import { Document } from 'mongoose';

import { ObjectId } from 'mongodb';
import { AdminUser } from 'src/admin/adminUser/entities/adminUser.entity';
const adminUsers: Omit<AdminUser, Exclude<keyof Document, '_id'>>[] = [
  {
    _id: new ObjectId('66e01242450ec6af8f4cbc0c'),
    createdAt: new Date(),
    email: 'sumit@stage.in',
    firstName: 'Sumit',
    lastName: 'Chauhan',
    password:
      'e08f40e5c3242c61d86df26ad08d89342e4d385bc176e5d69b5a0860ad12009474c3b38b6ad7398f06b2a5f408aaa37b7ac9e60e7a110292f27c0e5cf982a3d0',
    phoneNumber: '2234567890',
    role: new ObjectId('66d017ab6399cd029d558748'),
    salt: 'f912b799a5704a4cbae6615e729dd875',
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId('66e22e749754723dc59df243'),
    createdAt: new Date(),
    email: 'junaid@stage.in',
    firstName: 'Junaid',
    lastName: 'Qureshi',
    password:
      'ac2bc8affe562ca73216360ceca0fb9b00a19dff2771d7c95b2d3d104e58dc20ea37503fb943110bbee479f81fa0da00b55916885e8670e0c6015115d35f5cfa',
    phoneNumber: '1234567880',
    role: new ObjectId('66d0181a6399cd029d558751'),
    salt: '5d9c3e1368b2fb9609213be85c9d07f4',
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId('66d02430818ad68b7ee410fc'),
    createdAt: new Date(),
    email: 'tarun@stage.in',
    firstName: 'Tarun',
    lastName: 'S',
    password:
      'c84b56253cba1c732d79c15eed3dbdcbf90c7d8a8ddfd3533d186c56fa26da859bfb70d4696ddfc014da1c25cfcff97a0451dbb7da23cc244b47c4dcdaf266bd',
    phoneNumber: '1244567890',
    role: new ObjectId('66d017ab6399cd029d558748'),
    salt: '068d2693eadeb5146522e1e8a53bbc62',
    updatedAt: new Date(),
  },
];

export default adminUsers;
