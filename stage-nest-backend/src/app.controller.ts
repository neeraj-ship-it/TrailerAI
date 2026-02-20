import { TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { Public } from '@app/auth';

@Controller()
export class AppController {
  @Public()
  @TypedRoute.Get()
  getRoot(): string {
    return 'Hello, this is the root!';
  }
}
