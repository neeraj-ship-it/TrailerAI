import { Injectable } from '@nestjs/common';

import { VerifyVpaRequestBodyDto } from '../dtos/requests/verifyVpa.request.dto';
import { IJuspayVerifyVpaResponse } from '../dtos/responses/juspayVerifyVpa.response.interface';
import { VerifyVPAResponseDTO } from '../dtos/responses/verifyVpa.response.dto';
import { JuspayUpiService } from './juspayUpi.service';

@Injectable()
export class UpiService {
  constructor(private readonly juspayUpiService: JuspayUpiService) {}

  /**
   * verify vpa - user upi id
   *
   * @param {VerifyVpaRequestBodyDto} verifyVpaRequestBodyDto - paytm dispute id
   * @returns {IVerifyVpaResponse} - verify vpa response from juspay
   */
  public async verifyVpa(
    verifyVpaRequestBodyDto: VerifyVpaRequestBodyDto,
  ): Promise<VerifyVPAResponseDTO> {
    const { upiId } = verifyVpaRequestBodyDto;

    const juspayVerifyVpaResponse: IJuspayVerifyVpaResponse =
      await this.juspayUpiService.verifyVpa(upiId);

    const {
      customer_name: customerName,
      status,
      vpa,
    } = juspayVerifyVpaResponse;

    const verifyVpaResponse: VerifyVPAResponseDTO = {
      customerName,
      status,
      vpa,
    };

    return verifyVpaResponse;
  }
}
