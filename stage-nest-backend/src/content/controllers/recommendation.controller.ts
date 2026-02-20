import { Controller } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { ContentFormat } from '../entities/show.entity';
import { IPlatterResponse } from '../interfaces/content.interface';
import { RecommendationService } from '../services/recommendation.service';
import { Ctx, type Context } from '@app/auth/decorators/context.decorator';
import { Internal } from '@app/auth/decorators/internal.decorator';
import { Dialect } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';
import { NcantoHomePagePanelResponseDto } from 'common/interfaces/INcantoResponse';

@Controller('recommendation')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Internal()
  @TypedRoute.Get('check-subscription/:subscriberId')
  async checkNcantoSubscription(
    @TypedParam('subscriberId') subscriberId: string,
  ): Promise<boolean> {
    return this.recommendationService.checkNcantoSubscription(subscriberId);
  }

  @Internal()
  @TypedRoute.Get('panel-recommendations/:dialect/:subscriberId')
  async fetchPanelRecommendations(
    @TypedParam('dialect') dialect: Dialect,
    @TypedParam('subscriberId') subscriberId: string,
    @TypedQuery() query: { city?: string },
  ): Promise<NcantoHomePagePanelResponseDto> {
    return this.recommendationService.fetchPanelRecommendations(
      subscriberId,
      dialect,
      query.city ?? '',
    );
  }

  @TypedRoute.Get('platter')
  async getPlatterRecommendation(
    @TypedQuery()
    query: {
      rowKey: string;
      cacheKey?: string;
      type?: ContentType;
      format?: ContentFormat;
    },
    @Ctx() ctx: Context,
  ): Promise<IPlatterResponse> {
    return this.recommendationService.getplatterFromNcanto(
      query.rowKey,
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
      ctx.meta.platform,
      ctx.meta.os,
      query.type,
      query.format,
    );
  }

  @TypedRoute.Get('row')
  async getRecommendationRow(
    @TypedQuery() query: { rowKey: string; cacheKey?: string },
    @Ctx() ctx: Context,
  ) {
    return this.recommendationService.getRowData(
      query.rowKey,
      ctx.user.id,
      ctx.meta.dialect,
      ctx.meta.lang,
      true,
      query.cacheKey,
    );
  }
}
