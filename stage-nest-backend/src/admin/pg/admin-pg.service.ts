import { Injectable } from '@nestjs/common';

import { RevokeMandateRequestDto } from './dtos/revoke-mandate.request.dto';
import { RevokeTrigger } from '@app/common/enums/common.enums';
import { UserSubscriptionV1Service } from '@app/shared/services/userSubscriptionV1.service';

@Injectable()
export class AdminPgService {
  constructor(
    private readonly userSubscriptionV1Service: UserSubscriptionV1Service,
  ) {}

  async fetchUserActiveMandates(phoneNumber: string) {
    return this.userSubscriptionV1Service.fetchUserActiveMandates(phoneNumber);
  }

  async revokeMandate(revokeMandateRequestDto: RevokeMandateRequestDto) {
    const { docId, planId, platform, userId, vendor } = revokeMandateRequestDto;
    return this.userSubscriptionV1Service.revokeMandate(
      vendor,
      userId,
      docId,
      RevokeTrigger.ADMIN_DASHBOARD,
      platform,
      planId,
    );
  }
}
