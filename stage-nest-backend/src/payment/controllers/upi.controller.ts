import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { type VerifyVpaRequestBodyDto } from '../dtos/requests/verifyVpa.request.dto';
import { type VerifyVPAResponseDTO } from '../dtos/responses/verifyVpa.response.dto';
import { UpiService } from '../services/upi.service';

@Controller('upi')
export class UpiController {
  constructor(private readonly upiService: UpiService) {}

  @TypedRoute.Post('verify')
  async verifyVpa(
    @TypedBody() verifyVpaRequestBodyDto: VerifyVpaRequestBodyDto,
  ): Promise<VerifyVPAResponseDTO> {
    return this.upiService.verifyVpa(verifyVpaRequestBodyDto);
  }
}
