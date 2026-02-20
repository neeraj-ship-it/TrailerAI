import { Document } from 'mongoose';

import { Role } from 'src/admin/adminUser/entities/role.entity';
import { AccessEnum } from 'src/admin/refund/enums/privileges.enum';

export const roleData: Omit<Role, keyof Document>[] = [
  {
    createdAt: new Date(),
    privileges: [
      {
        access: AccessEnum.ALL,
        code: 'FULL_ACCESS',
        module: 'ALL',
      },
    ],
    roleDescription: 'Has access to all admin feature',
    roleName: 'Super Admin',
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    privileges: [
      {
        access: AccessEnum.READ,
        code: 'REFUND_READ',
        module: 'REFUND',
      },
      {
        access: AccessEnum.UPDATE,
        code: 'REFUND_UPDATE',
        module: 'REFUND',
      },
    ],
    roleDescription: 'Has access to all refund feature',
    roleName: 'Futwork Team',
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    privileges: [
      {
        access: AccessEnum.READ,
        code: 'PG_READ',
        module: 'PG',
      },
    ],
    roleDescription: 'Has access to read PG feature',
    roleName: 'PG Update USER',
    updatedAt: new Date(),
  },
];
