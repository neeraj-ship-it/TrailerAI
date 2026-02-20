import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Param } from '@nestjs/common';

import type { PlatterContentDTO, UpdatePlatterDTO } from '../dtos/platter.dto';

import { PlatterService } from '../services/platter.service';

import { Admin } from '@app/auth/decorators/admin.decorator';

import { CombinedPlatterType } from '@app/common/entities/combined-platter.entity';
import type { Dialect } from '@app/common/enums/app.enum';

@Controller('platter')
export class PlatterController {
  constructor(private readonly platterService: PlatterService) {}

  @TypedRoute.Get('/content/:dialect')
  @Admin()
  async getContent(
    @Param('dialect') dialect: Dialect,
  ): Promise<PlatterContentDTO[]> {
    return await this.platterService.getContent(dialect);
  }

  @TypedRoute.Get('/details/:type/:dialect')
  @Admin()
  async getPlatterDetails(
    @Param('type') type: CombinedPlatterType,
    @Param('dialect') dialect: Dialect,
  ) {
    return this.platterService.getPlatterDetails(type, dialect);
  }

  @TypedRoute.Post('/update')
  @Admin()
  async updatePlatter(@TypedBody() body: UpdatePlatterDTO) {
    return this.platterService.updateContent(body);
  }
}
