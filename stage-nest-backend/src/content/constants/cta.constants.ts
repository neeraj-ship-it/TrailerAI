import { Lang } from 'common/enums/app.enum';

export const CONTECT_DETAILS_CTA_CONSTANTS = {
  [Lang.EN]: {
    continueWatching: 'Continue Watching',
    startWatching: 'Start Watching',
    watchAgain: 'Watch again',
    watchFromBeginning: 'Watch From Beginning',
    watchNow: 'Watch Now',
  },
  [Lang.HIN]: {
    continueWatching: 'देखना जारी रखें',
    startWatching: 'देखना शुरू करें',
    watchAgain: 'दोबारा देखें',
    watchFromBeginning: 'शुरुआत से देखें',
    watchNow: 'अभी देखें',
  },
};

export const PROGRESS_THRESHOLDS = {
  MINIMAL_PROGRESS: 2,
  NEAR_COMPLETION: 97,
};

export const COMING_SOON_LABEL_CONSTANTS = {
  EXPIRY_DAYS: 30, // Days after comingSoonDate when label should be removed
  LABEL_TEXT: {
    [Lang.EN]: '🔥 New Episode',
    [Lang.HIN]: '🔥 नया एपिसोड',
  },
};
