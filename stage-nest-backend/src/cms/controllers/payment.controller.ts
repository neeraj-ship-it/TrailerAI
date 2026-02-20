import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';

import type {
  CreateImageUrlDto,
  CreatePaywallDto,
  CreatePlanDto,
  GetAllPlansDto,
  getPlansForPostSubscriptionResponseDto,
  PaywallDetailsResponseDto,
  PaywallListResponseDto,
  PlanDetailsResponseDto,
  PublishPaywallDto,
  TransformImageDto,
} from '../dtos/payment.dto';

import { PaymentService } from '../services/payment.service';
import { Admin, AdminUserGuard } from '@app/auth';
import { PlanCountryEnum, PlanStatusEnum } from '@app/payment/enums/plan.enum';
import { Paywall } from 'common/entities/paywall.entity';
import { Plan } from 'common/entities/plan.entity';
import { OS } from 'common/enums/app.enum';
import { PaginatedQueryResponse } from 'common/repositories/base.repository';
import { privilegesEnum } from 'src/admin/adminUser/enums/privileges.enum';

@Controller('payment')
@UseGuards(AdminUserGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @TypedRoute.Get('plan-availability/:planId/:os/:country')
  async checkPlanAvailabilityForPaywall(
    @TypedParam('planId') planId: string,
    @TypedParam('os') os: OS,
    @TypedParam('country') country: PlanCountryEnum,
  ): Promise<{ available: boolean; plan: PlanDetailsResponseDto | null }> {
    return this.paymentService.checkPlanAvailabilityForPaywall({
      country,
      os,
      planId,
    });
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
    privilegesEnum.PAYWALL_READ,
  )
  @TypedRoute.Get('check-plan-name-exists/:os/:country/:planName')
  async checkPlanNameExists(
    @TypedParam('planName') planName: string,
    @TypedParam('os') os: OS,
    @TypedParam('country') country: PlanCountryEnum,
  ): Promise<{
    exists: boolean;
  }> {
    return this.paymentService.checkPlanNameExists(planName, os, country);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @Post('create-image-url')
  async createImageUrl(
    @TypedBody()
    body: CreateImageUrlDto,
  ): Promise<{ filename: string; uploadUrl: string }> {
    return await this.paymentService.createImageUrl(body);
  }

  @Admin(
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
    privilegesEnum.FULL_ACCESS,
  )
  @Post('paywall')
  @ApiOperation({ summary: 'Create or update a paywall' })
  @ApiResponse({
    description: 'Paywall created/updated successfully',
    status: 201,
  })
  @ApiResponse({ description: 'Bad request', status: 400 })
  async createOrUpdatePaywall(
    @TypedBody() paywall: CreatePaywallDto,
  ): Promise<Paywall> {
    return this.paymentService.createOrUpdatePaywall(paywall);
  }

  @Admin(
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
    privilegesEnum.FULL_ACCESS,
  )
  @Post('plans')
  @ApiOperation({ summary: 'Create a new payment plan' })
  @ApiResponse({ description: 'Plan created successfully', status: 201 })
  @ApiResponse({ description: 'Bad request', status: 400 })
  async createPlan(@Body() plan: CreatePlanDto): Promise<Plan> {
    return this.paymentService.createOrUpdatePlan(plan);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @Post('video-upload-url')
  async generatePaywallVideoUploadUrl(
    @Body()
    body: {
      mimeType: string;
      fileExtension: string;
      planId: string;
      fileName: string;
    },
  ) {
    return this.paymentService.generatePaywallVideoUploadUrl(body);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_READ,
    privilegesEnum.PAYWALL_WRITE,
  )
  @Get('paywalls')
  async getAllPaywalls(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ): Promise<PaginatedQueryResponse<PaywallListResponseDto>> {
    return this.paymentService.getAllPaywalls({ page, perPage });
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_READ,
    privilegesEnum.PAYWALL_WRITE,
  )
  @Get('plans')
  @ApiOperation({ summary: 'Get all payment plans' })
  @ApiResponse({
    description: 'Plans retrieved successfully',
    status: 200,
  })
  async getAllPlans(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ): Promise<GetAllPlansDto> {
    return this.paymentService.getAllPlans({ page, perPage });
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_READ,
    privilegesEnum.PAYWALL_WRITE,
  )
  @TypedRoute.Get('paywall/:paywallId')
  @ApiOperation({ summary: 'Get paywall details by ID' })
  @ApiResponse({
    description: 'Paywall details retrieved successfully',
    status: 200,
  })
  @ApiResponse({ description: 'Paywall not found', status: 404 })
  async getPaywallDetails(
    @TypedParam('paywallId') paywallId: string,
  ): Promise<PaywallDetailsResponseDto> {
    return this.paymentService.getPaywallDetails(paywallId);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_READ,
    privilegesEnum.PAYWALL_WRITE,
  )
  @TypedRoute.Get('plan/:planId')
  async getPlanByPlanId(
    @TypedParam('planId') planId: string,
  ): Promise<PlanDetailsResponseDto> {
    return this.paymentService.getPlanByPlanId(planId);
  }

  // /cms/payment/plan/post-subscription
  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @TypedRoute.Get('plan/post-subscription')
  async getPlansEligibleForPostSubscription(): Promise<
    getPlansForPostSubscriptionResponseDto[]
  > {
    return this.paymentService.getPlansEligibleForPostSubscription();
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @Post('publish')
  async publishPaywall(
    @Body() publishData: PublishPaywallDto,
  ): Promise<{ paywall: Paywall; plan: Plan }> {
    return this.paymentService.publishPaywall(publishData);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @TypedRoute.Post('plan/publish/:planId')
  async publishPlan(
    @TypedParam('planId') planId: string,
  ): Promise<{ status: PlanStatusEnum }> {
    return this.paymentService.publishPlan(planId);
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @Post('transform-image')
  async transformImage(@Body() body: TransformImageDto) {
    return await this.paymentService.transformImage({
      sourceLink: body.sourceLink,
    });
  }

  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.PAYWALL_ALL,
    privilegesEnum.PAYWALL_WRITE,
  )
  @TypedRoute.Patch('toggle-plan-visibility/:planId')
  async updatePlanVisibility(
    @TypedParam('planId') planId: string,
    @Body() body: { visibility: boolean },
  ): Promise<{ visibility: boolean }> {
    return this.paymentService.updatePlanVisibility(planId, body.visibility);
  }
}
