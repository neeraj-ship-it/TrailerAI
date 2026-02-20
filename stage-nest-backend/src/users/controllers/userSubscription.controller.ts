import { Controller } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';

import { UserSubscriptionV2Service } from '../../shared/services/userSubscriptionV2.service';
import { GetUserSubscriptionResponseDto } from '../dtos/getUserSubscription.response.dto';
import { SubscriptionAndMandateStatusResponseDTO } from '../dtos/subscriptionAndMandateStatus.response.dto';
import {
  GetUserSubscriptionV2DetailsResponseDto,
  GetUserSubscriptionV2StatusResponseDto,
} from '../dtos/userSubscriptionV2.dto';
import { UserSubscriptionService } from '../services/userSubscription.service';
import { type ContextUser, CtxUser } from 'libs/auth/src';

@Controller('subscription')
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly userSubscriptionV2Service: UserSubscriptionV2Service,
  ) {}

  @TypedRoute.Get('sub-mandate-status')
  async getSubscriptionAndMandateStatus(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<SubscriptionAndMandateStatusResponseDTO> {
    return this.userSubscriptionService.getLatestSubscriptionAndMandateStatus(
      ctxUser.id,
    );
  }

  @TypedRoute.Get('status')
  async getUserSubscriptionDetails(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<GetUserSubscriptionResponseDto> {
    return this.userSubscriptionService.getSubscriptionDetails({
      userId: ctxUser.id,
    });
  }

  @TypedRoute.Get('details')
  async getUserSubscriptionDetailsV2(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<GetUserSubscriptionV2DetailsResponseDto> {
    return this.userSubscriptionV2Service.getSubscriptionDetails({
      userId: ctxUser.id,
    });
  }

  @TypedRoute.Get('statusV2')
  async getUserSubscriptionStatusV2(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<GetUserSubscriptionV2StatusResponseDto> {
    return this.userSubscriptionV2Service.getSubscriptionStatus({
      userId: ctxUser.id,
    });
  }
}
