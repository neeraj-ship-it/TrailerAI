import { Injectable, Logger } from '@nestjs/common';

import { attachCountryCode } from '@app/common/helpers/phoneNumber.helper';
import { UserRepository } from '@app/common/repositories/user.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class NotificationRecipientService {
  private readonly logger = new Logger(NotificationRecipientService.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async getPhoneNumberFromUserId(userId: string): Promise<string> {
    const user = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRepository.findById(
        userId,
        ['_id', 'primaryMobileNumber', 'countryCode'],
        {
          cache: { enabled: true },
          lean: true,
        },
      ),
      Errors.USER.USER_NOT_FOUND(),
    );

    const { countryCode, primaryMobileNumber } = user;

    if (!primaryMobileNumber) {
      const warningMsg = `User phone number not found for userId: ${userId}`;
      this.logger.warn(warningMsg);
      throw Errors.USER.USER_INFO_REQUIRED(warningMsg);
    }

    // In case of international numbers don't send notification
    if (countryCode != undefined && countryCode != '+91') {
      const warningMsg = `Can't send notification for international numbers with countryCode: ${countryCode}`;
      this.logger.warn(warningMsg);
      throw Errors.UNSUPPORTED_FUNCTIONALITY(warningMsg);
    }

    return attachCountryCode(primaryMobileNumber, countryCode);
  }
}
