import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { Public } from '@app/auth';

import {
  type ReceiveLeadUpdateFromFutworkRequestDTO,
  type SendLeadtoFutworkRequestDTO,
  type UpdateLeadOnFutworkRequestDTO,
} from '../dtos/futwork.dto';
import { FutworkService } from '../services/futwork.service';

@Controller('futwork')
export class FutworkController {
  constructor(private readonly futworkService: FutworkService) {}

  @Public()
  @TypedRoute.Post('receive-webhook')
  async handleLeadUpdate(
    @TypedBody() requestData: ReceiveLeadUpdateFromFutworkRequestDTO,
  ): Promise<{ message: string }> {
    await this.futworkService.handleLeadUpdate(requestData);
    return { message: 'Lead update processed successfully' };
  }

  @Public()
  @TypedRoute.Post('send-lead')
  async sendLeadToFutwork(
    @TypedBody() requestData: SendLeadtoFutworkRequestDTO,
  ): Promise<{ message: string }> {
    const result = await this.futworkService.sendLeadToFutwork(requestData);
    return { message: result.message };
  }

  @Public()
  @TypedRoute.Post('update-lead-on-futwork')
  async sendLeadUpdateToFutwork(
    @TypedBody() requestData: UpdateLeadOnFutworkRequestDTO,
  ): Promise<{ message: string }> {
    await this.futworkService.sendLeadUpdateToFutwork(requestData);
    return { message: 'Lead update processed successfully' };
  }
}
