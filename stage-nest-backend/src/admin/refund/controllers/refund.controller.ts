import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';

import { privilegesEnum } from '../../adminUser/enums/privileges.enum';
import { type GetTransactionDto } from '../dtos/getTransaction.request.dto';
import { type UserSubscriptionsResponseDto } from '../dtos/getTransaction.response.dto';
import { type RefundRequestDto } from '../dtos/refund.request.dto';
import { type RefundResponseDto } from '../dtos/refund.response.dto';
import { RefundService } from '../services/refund.service';
import { Admin, AdminUserGuard, Internal } from '@app/auth';
import { CtxUser } from 'libs/auth/src';

@UseGuards(AdminUserGuard)
@Controller()
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @TypedRoute.Get('transactions')
  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.REFUND_ALL,
    privilegesEnum.REFUND_READ,
  )
  async getTransactions(
    @TypedQuery() payload: GetTransactionDto,
  ): Promise<UserSubscriptionsResponseDto> {
    return this.refundService.getTransactions(payload);
  }

  @TypedRoute.Post('initiate')
  @Internal()
  @Admin(
    privilegesEnum.FULL_ACCESS,
    privilegesEnum.REFUND_ALL,
    privilegesEnum.REFUND_WRITE,
  )
  async refund(
    @TypedBody() refundPayload: RefundRequestDto,
    @CtxUser() { id }: { id: string },
  ): Promise<RefundResponseDto> {
    return this.refundService.refund(refundPayload, id);
  }
}
