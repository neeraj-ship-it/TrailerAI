import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { APP_CONFIGS } from '@app/common/configs/app.config';

import { IJuspayVerifyVpaResponse } from '../dtos/responses/juspayVerifyVpa.response.interface';

const { JUSPAY: juspayConfigs } = APP_CONFIGS;
@Injectable()
export class JuspayUpiService {
  private logger = new Logger(JuspayUpiService.name);

  public async verifyVpa(vpa: string): Promise<IJuspayVerifyVpaResponse> {
    // prepare request with base64 encoded api key & url-encoding for data
    const data = new URLSearchParams();
    data.append('vpa', vpa);
    data.append('merchant_id', juspayConfigs.MERCHANT_ID);
    const encodedApiKey = Buffer.from(juspayConfigs.API_KEY).toString('base64');

    const options = {
      headers: {
        Authorization: `Basic ${encodedApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const uri = juspayConfigs.API_URL + `/v2/upi/verify-vpa`;

    this.logger.log(`Requesting to juspay to verify upi-id: ${vpa}`);

    const response = await axios.post(uri, data.toString(), options);

    this.logger.log(`Juspay verify-vpa response for upi-id:${vpa}`, {
      response: response.data,
    });
    return response.data;
  }
}
