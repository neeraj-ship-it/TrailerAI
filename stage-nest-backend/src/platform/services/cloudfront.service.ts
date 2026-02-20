import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';

import { Injectable } from '@nestjs/common';

import { APP_CONFIGS } from '@app/common/configs/app.config';

@Injectable()
export class CloudfrontService {
  private readonly client: CloudFrontClient;
  private readonly stageAPIDistributionId = 'E2OJ562F4HS93C';
  constructor() {
    this.client = new CloudFrontClient({
      credentials: {
        accessKeyId: APP_CONFIGS.AWS.ACCESS_KEY_ID,
        secretAccessKey: APP_CONFIGS.AWS.SECRET_ACCESS_KEY,
      },
      region: APP_CONFIGS.AWS.CLOUDFRONT.REGION,
    });
  }

  async createInvalidation() {
    const command = new CreateInvalidationCommand({
      DistributionId: this.stageAPIDistributionId,
      InvalidationBatch: {
        CallerReference: new Date().toISOString(),
        Paths: { Items: ['/*'], Quantity: 1 },
      },
    });
    return this.client.send(command);
  }
}
