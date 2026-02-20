import { AdminUser } from 'src/admin/adminUser/entities/adminUser.entity';
import { Role } from 'src/admin/adminUser/entities/role.entity';
import { Refund } from 'src/admin/refund/entities/refund.entity';

import { ModelDefinition } from '@nestjs/mongoose';

import { Plan } from '@app/common/entities/plan.entity';
import { RecurringTransaction } from '@app/common/entities/recurringTransaction.entity';
import { ReelEntity } from '@app/common/entities/reel.entity';
import { Setting } from '@app/common/entities/setting.entity';
import { User } from '@app/common/entities/user.entity';
import { UserEvent } from '@app/common/entities/user.event';
import { UserAccountInvite } from '@app/common/entities/userAccountInvite.entity';
import { UserCultures } from '@app/common/entities/userCultures.entity';
import { UserDeviceRecord } from '@app/common/entities/userDeviceRecord.entity';
import { UserProfile } from '@app/common/entities/userProfile.entity';
import { UserSubscriptionV1 } from '@app/common/entities/userSubscription.entity';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { WatchVideoEvent } from '@app/common/entities/watchVideoEvent.entity';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ContentProfile } from 'src/content/entities/contentProfile.entity';
// import { ContentProfile } from 'src/content/entities/contentProfile.entity';
import { Episode } from 'src/content/entities/episodes.entity';
import { Season } from 'src/content/entities/season.entity';
import { Show } from 'src/content/entities/show.entity';
import { UpcomingSection } from 'src/content/entities/upcomingSection.entity';

export const testEntityMap: Record<string, ModelDefinition> = {
  [AdminUser.name]: createModelDefinition(AdminUser),
  [ContentProfile.name]: createModelDefinition(ContentProfile),
  [Episode.name]: createModelDefinition(Episode),
  // [MandateTransactions.name]: createModelDefinition(MandateTransactions),
  // [MandateV2.name]: createModelDefinition(MandateV2),
  [Plan.name]: createModelDefinition(Plan),
  [RecurringTransaction.name]: createModelDefinition(RecurringTransaction),
  [ReelEntity.name]: createModelDefinition(ReelEntity),
  [Refund.name]: createModelDefinition(Refund),
  [Role.name]: createModelDefinition(Role),
  [Season.name]: createModelDefinition(Season),
  [Setting.name]: createModelDefinition(Setting),
  [Show.name]: createModelDefinition(Show),
  [UpcomingSection.name]: createModelDefinition(UpcomingSection),
  [User.name]: createModelDefinition(User),
  [UserAccountInvite.name]: createModelDefinition(UserAccountInvite),
  [UserCultures.name]: createModelDefinition(UserCultures),
  [UserDeviceRecord.name]: createModelDefinition(UserDeviceRecord),
  [UserEvent.name]: createModelDefinition(UserEvent),
  [UserProfile.name]: createModelDefinition(UserProfile),
  [UserSubscriptionHistory.name]: createModelDefinition(
    UserSubscriptionHistory,
  ),
  [UserSubscriptionV1.name]: createModelDefinition(UserSubscriptionV1),
  // [UserSubscriptionV2.name]: createModelDefinition(UserSubscriptionV2),
  [WatchVideoEvent.name]: createModelDefinition(WatchVideoEvent),
};
