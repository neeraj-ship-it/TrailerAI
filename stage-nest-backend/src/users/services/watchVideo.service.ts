import { Injectable, Logger } from '@nestjs/common';

import { Platform } from '@app/common/enums/app.enum';
import { WatchVideoEventRepository } from '@app/common/repositories/watchVideoEvent.repository';

@Injectable()
export class WatchVideoService {
  private readonly logger = new Logger(WatchVideoService.name);

  constructor(
    private readonly watchVideoEventRepository: WatchVideoEventRepository,
  ) {}

  async hasUserWatchedContentOnTvPlatform(userId: string): Promise<boolean> {
    try {
      const watchEvent = await this.watchVideoEventRepository.findOne(
        {
          platform: Platform.TV,
          user_id: userId,
        },
        ['_id'],
        { lean: true },
      );

      return !!watchEvent;
    } catch (error) {
      this.logger.error(
        { error, userId },
        `Failed to check if user has watched content on TV platform`,
      );
      return false;
    }
  }
}
