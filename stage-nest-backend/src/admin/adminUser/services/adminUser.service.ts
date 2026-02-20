import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { CreateAdminUserRequestDto } from '../dtos/createAdminUser.request.dto';
import { AdminUser } from '../entities/adminUser.entity';
import { AdminUserRepository } from '../repositories/adminUser.repository';
import { RoleRepository } from '../repositories/role.repository';
import { AdminAuthService } from './adminAuth.service';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly adminAuthService: AdminAuthService,
    private readonly roleRepository: RoleRepository,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async createUser(payload: CreateAdminUserRequestDto): Promise<AdminUser> {
    const { role } = payload;
    let currentRole;
    const roleExists = await this.roleRepository.findOne({
      roleName: role.roleName,
    });
    if (!roleExists) {
      const { privileges, roleDescription, roleName } = role;
      const roleCreated = await this.roleRepository.create({
        privileges,
        roleDescription,
        roleName,
      });
      currentRole = roleCreated._id;
    } else {
      currentRole = roleExists._id;
    }
    const { hashedPassword, salt } =
      this.adminAuthService.generateHashedPassword(payload.password);
    const roleId = new Types.ObjectId(currentRole);
    return this.adminUserRepository.create({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      password: hashedPassword,
      phoneNumber: payload.phoneNumber,
      role: roleId,
      salt,
    });
  }

  async isValidToken(token: string): Promise<{ isValid: boolean }> {
    return { isValid: !!(await this.adminAuthService.decode(token)) };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const adminUser = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.adminUserRepository.findOne(
        { email },
        ['password', 'salt', 'role', '_id'],
        { lean: true, populate: 'role' },
      ),
      Errors.USER.USER_NOT_FOUND(),
    );
    const isValidPassword = await this.adminAuthService.verifyPassword(
      password,
      adminUser.password,
      adminUser.salt,
    );
    if (!isValidPassword) {
      throw Errors.AUTH.UNAUTHORIZED('Invalid credentials');
    }

    const role = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.roleRepository.findOne(
        {
          _id: adminUser.role._id,
        },
        ['roleName', 'privileges', '_id'],
        { lean: true },
      ),
      Errors.ROLE.ROLE_NOT_FOUND(),
    );
    const privileges = role.privileges.map((p) => p.code);
    return {
      accessToken: await this.adminAuthService.generateJwtToken({
        privileges,
        role: role.roleName,
        userId: adminUser._id.toString(),
      }),
    };
  }
}
