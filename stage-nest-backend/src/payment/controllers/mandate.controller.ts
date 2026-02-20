import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { type CreateMandateRequestDTO } from '../dtos/requests/mandate.request.dto';
import type {
  CreateMandateResponseDTO,
  GetMandateLatestTransactionStatusResponseDTO,
  MandateStatusResponseDTO,
  ToggleMandateStatusResponseDTO,
} from '../dtos/responses/mandate.response.dto';
import { MandateService } from '../services/mandate.service';
import { type Context, type ContextUser, Ctx, CtxUser } from '@app/auth';

@Controller('mandate')
export class MandateController {
  constructor(private readonly mandateService: MandateService) {}

  @TypedRoute.Post('create')
  async createMandate(
    @TypedBody() createMandateRequest: CreateMandateRequestDTO,
    @Ctx() ctx: Context,
  ): Promise<CreateMandateResponseDTO> {
    return this.mandateService.createMandate(createMandateRequest, ctx);
  }

  @TypedRoute.Get('status')
  async getLatestMandateStatus(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<MandateStatusResponseDTO> {
    return this.mandateService.getLatestMandateStatus(ctxUser.id);
  }

  @TypedRoute.Get('txn-status')
  async getTxnStatus(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<GetMandateLatestTransactionStatusResponseDTO> {
    return this.mandateService.getMandateLatestTransactionStatus(ctxUser.id);
  }

  @TypedRoute.Patch('update')
  async toggleSubscription(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<ToggleMandateStatusResponseDTO> {
    return this.mandateService.toggleMandateStatus({
      userId: ctxUser.id,
    });
  }
}
