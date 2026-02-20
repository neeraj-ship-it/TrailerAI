import { TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { Public } from '@app/auth/decorators/public.decorator';
import { Dialect } from 'common/enums/app.enum';
import { CommonService } from 'src/content/services/common.service';

export interface ListDialectsResponse {
  abbreviation: Dialect;
  name: string;
}

@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Public()
  @TypedRoute.Get('/dialects')
  async listDialects(): Promise<ListDialectsResponse[]> {
    return this.commonService.listDialects();
  }
}
