import {
  Entity,
  EntityRepositoryType,
  Enum,
  Property,
  type Ref,
} from '@mikro-orm/mongodb';

import { CMSUserRepository } from '../repositories/cms-user.repository';
import { MongoBaseEntity } from '@app/common/entities/mongoBase.entity'; // Assuming this base entity exists based on context

export enum CMSUserStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity({ collection: 'cmsusers', repository: () => CMSUserRepository })
export class CMSUser extends MongoBaseEntity {
  @Property()
  email!: string;

  [EntityRepositoryType]?: CMSUserRepository;

  @Property()
  firstName!: string;

  @Property()
  lastLogin?: Date;

  @Property()
  lastName!: string;

  @Property({ hidden: true, lazy: true, ref: true })
  password_v2!: Ref<string>;

  @Property()
  roleId!: string;

  @Property({ hidden: true, lazy: true, ref: true })
  salt!: Ref<string>;

  @Property({ default: false })
  showSubscriptionTab!: boolean;

  @Enum(() => CMSUserStatusEnum)
  status!: CMSUserStatusEnum;

  @Property({ name: 'fullName' })
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
