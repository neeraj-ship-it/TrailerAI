import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Headers } from '@nestjs/common';

import { type DecryptRequest, type DecryptResponse } from '../dtos/decrypt.dto';
import { DecryptService } from '../services/decrypt.service';
import { Public } from '@app/auth';

@Controller('decrypt')
export class DecryptController {
  constructor(private readonly decryptService: DecryptService) {}

  @Public()
  @TypedRoute.Post('/meta')
  async decryptMeta(
    @TypedBody() body: DecryptRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<DecryptResponse> {
    const { cipher, nonce } = body;

    if (!cipher || !nonce) {
      throw new Error('Cipher and nonce are required');
    }

    // Extract device ID from headers (similar to User entity pattern)
    const deviceId = headers['deviceid'] || headers['device_id'] || 'unknown';

    const deeplink = await this.decryptService.decryptMeta(
      cipher,
      nonce,
      deviceId,
    );

    return {
      deeplink,
    };
  }
}
