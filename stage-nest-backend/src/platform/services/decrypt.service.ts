import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

import { MetaDecryptedData } from '../entities/metaDecryptedData.entity';
import { MetaDecryptedDataPayload } from '../interfaces/metaDecryptedData.interface';
import { DecryptDataRepository } from '../repositories/decryptData.repository';

@Injectable()
export class DecryptService {
  private readonly logger = new Logger(DecryptService.name);
  private readonly metaEncryptionKey: Buffer;
  // TODO: Add Google encryption key when implementing Google decrypt
  // private readonly googleEncryptionKey: string;

  constructor(private readonly decryptDataRepository: DecryptDataRepository) {
    // Meta AES-GCM 256bit symmetric key (convert hex to buffer)
    const keyHex =
      '0ce16eb152892d50081b103f360c3da178758adffff9dbc534551e69d2c96c17';
    this.metaEncryptionKey = Buffer.from(keyHex, 'hex');
  }

  private extractDeeplinkFromAdgroupName(adgroupName: string): string | null {
    try {
      // Look for the pattern: _deeplink_stage://...
      const deeplinkMatch = adgroupName.match(/_deeplink_(stage:\/\/[^\s]+)/);

      if (deeplinkMatch && deeplinkMatch[1]) {
        return deeplinkMatch[1];
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to extract deeplink from adgroup_name', error);
      return null;
    }
  }

  private async saveDecryptData(
    data: Partial<MetaDecryptedData>,
  ): Promise<void> {
    try {
      await this.decryptDataRepository.createDecryptRecord(data);
    } catch (error) {
      this.logger.error('Failed to save decrypt data to database', error);
    }
  }

  async decryptMeta(
    cipher: string,
    nonce: string,
    deviceId: string,
  ): Promise<string> {
    try {
      const correctedCipher = cipher.replace(/l/g, '1').replace(/O/g, '0');
      // Convert hex strings to buffers
      const cipherBuffer = Buffer.from(correctedCipher, 'hex');
      const nonceBuffer = Buffer.from(nonce, 'hex');

      // Create decipher using AES-GCM with the nonce
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.metaEncryptionKey,
        nonceBuffer,
      );
      decipher.setAuthTag(cipherBuffer.slice(-16)); // Last 16 bytes are the auth tag
      decipher.setAAD(Buffer.alloc(0)); // No additional authenticated data

      // Decrypt the data
      let decryptedString = decipher.update(
        cipherBuffer.slice(0, -16),
        undefined,
        'utf8',
      );
      decryptedString += decipher.final('utf8');

      // Parse JSON
      const parsedData: MetaDecryptedDataPayload = JSON.parse(decryptedString);
      let status: 'pending' | 'processed' | 'failed' = 'failed';

      // Extract deeplink from adgroup_name if it exists (Meta specific)
      if (parsedData.adgroup_name) {
        const deeplink = this.extractDeeplinkFromAdgroupName(
          parsedData.adgroup_name,
        );
        if (deeplink) {
          parsedData.deeplink = deeplink;
          status = 'processed';
        }
      }

      // Save to database
      await this.saveDecryptData({
        accountId: parsedData.account_id,
        adGroupId: parsedData.adgroup_id,
        adgroupName: parsedData.adgroup_name,
        adId: parsedData.ad_id,
        adObjectiveName: parsedData.ad_objective_name,
        campaignGroupId: parsedData.campaign_group_id,
        campaignGroupName: parsedData.campaign_group_name,
        campaignId: parsedData.campaign_id,
        campaignName: parsedData.campaign_name,
        cipher,
        deeplink: parsedData.deeplink,
        deviceId,
        nonce,
        rawJson: JSON.stringify(parsedData),
        status,
      });

      return parsedData.deeplink || '';
    } catch (error) {
      this.logger.error(
        { cipher, deviceId, error, nonce },
        'Decryption failed for cipher',
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }
}
