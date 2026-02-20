import { Injectable } from '@nestjs/common';

import { PartnerLoginInterface } from '../dtos/PartnerRequestBody.dto';
import { IPartnerService } from './interfaces/IPartnerService';

import { JioService } from './jio.service';
import { StcService } from './stc.service';
import { PartnerLoginSource } from '@app/common/enums/app.enum';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class PartnerFactory {
  private readonly partnerServices: Map<PartnerLoginSource, IPartnerService>;

  constructor(
    private readonly jioService: JioService,
    private readonly stcService: StcService,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {
    // Initialize the map from the injected services
    this.partnerServices = new Map<PartnerLoginSource, IPartnerService>([
      [PartnerLoginSource.JIO, this.jioService],
      [PartnerLoginSource.STC, this.stcService],
    ]);
  }

  async getPartnerService(
    body: PartnerLoginInterface,
  ): Promise<IPartnerService> {
    const service = this.partnerServices.get(body.loginSource);
    if (!service) {
      throw Errors.PARTNER.INVALID_LOGIN_SOURCE();
    }
    return service;
  }
}
