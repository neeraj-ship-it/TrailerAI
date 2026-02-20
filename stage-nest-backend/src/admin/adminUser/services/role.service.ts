import { Injectable } from '@nestjs/common';

import { AccessEnum } from '../../refund/enums/privileges.enum';
import { RoleRepository } from '../repositories/role.repository';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}
  createRole(
    roleName: string,
    roleDescription: string,
    privileges: [
      {
        code: string;
        module: string;
        access: AccessEnum;
      },
    ],
  ) {
    return this.roleRepository.create({
      privileges,
      roleDescription,
      roleName,
    });
  }
  getRoleByName(roleName: string) {
    return this.roleRepository.findOne({ roleName });
  }
}
