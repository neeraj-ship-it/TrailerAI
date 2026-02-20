import { Inject, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

import { Errors } from '@app/error-handler';
import { ErrorHandlerService } from '@app/error-handler';

import jwt from 'jsonwebtoken';

interface PartnerSubscriptionRequest {
  mobileNumber: string;
  planId: string;
}

interface PartnerSubscriptionResponse {
  data: {
    accountId: string;
    subscriptionStatus: string;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    userId?: string;
  };
  responseMessage: string;
}

@Injectable()
export class InternalExpressService {
  private readonly logger = new Logger(InternalExpressService.name);

  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  async subscribeUserToPartner(
    mobileNumber: string,
    partnerId: string,
    baseUrl: string,
    secretKey: string,
    planId: string,
  ): Promise<PartnerSubscriptionResponse> {
    // 1. Generate JWT token
    const token = jwt.sign(
      {
        mobileNumber,
        partnerId: partnerId,
      },
      secretKey,
      { expiresIn: '60s' },
    );

    // 2. Prepare request
    const url = `${baseUrl}v23/partner/subscription?partnerId=${partnerId}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const body: PartnerSubscriptionRequest = {
      mobileNumber,
      planId: planId,
    };

    // 3. Make POST request

    const [response, error] = await this.errorHandlerService.try<
      PartnerSubscriptionResponse,
      AxiosError
    >(async () => {
      const response = await axios.post<PartnerSubscriptionResponse>(
        url,
        body,
        {
          headers,
        },
      );
      return response.data;
    });

    if (error) {
      this.logger.error({ error }, 'Error subscribing user to partner');
      throw Errors.USER.USER_NOT_SUBSCRIBED();
    } else {
      return response;
    }
  }
}
