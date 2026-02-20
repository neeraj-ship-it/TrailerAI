import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  RmNumbersResponseDto,
  type UpdateRmNumbersRequestDto,
} from '../dtos/rmNumbers.dto';
import { Public } from '@app/auth';
import { RmNumbersService } from 'src/shared/services/rmNumbers.service';

@Controller('rm-numbers')
export class RmNumbersController {
  constructor(private readonly rmNumbersService: RmNumbersService) {}

  @Public()
  @TypedRoute.Get()
  async getRmNumbers(): Promise<RmNumbersResponseDto> {
    const rmNumbers = await this.rmNumbersService.getRmNumbers();
    return { rmNumbers };
  }

  @Public()
  @TypedRoute.Patch()
  async updateRmNumbers(
    @TypedBody() updateRmNumbersRequestDto: UpdateRmNumbersRequestDto,
  ): Promise<RmNumbersResponseDto> {
    const rmNumbers = await this.rmNumbersService.updateRmNumbers(
      updateRmNumbersRequestDto.rmNumbers,
    );
    return { rmNumbers };
  }
}
