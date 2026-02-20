import { SetMetadata } from '@nestjs/common';

import { DecoratorConstants } from '@app/common/constants/app.constant';

export const CMSAuth = (...privileges: string[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(DecoratorConstants.CMS, true)(target, key, descriptor);
    SetMetadata(DecoratorConstants.Privileges, privileges)(
      target,
      key,
      descriptor,
    );
  };
};
