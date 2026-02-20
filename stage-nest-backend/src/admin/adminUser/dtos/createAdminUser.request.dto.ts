import { AccessEnum } from 'src/admin/refund/enums/privileges.enum';

export interface CreatePrivilegeDto {
  access: AccessEnum;
  code: string;
  module: string;
}

export interface CreateRoleDto {
  privileges: CreatePrivilegeDto[];
  roleDescription: string;
  roleName: string;
}

export interface CreateAdminUserRequestDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber: string;
  role: CreateRoleDto;
}
