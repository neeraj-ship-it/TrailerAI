import { APP_CONFIGS } from '@app/common/configs/app.config';

export const OnboardingAssets = {
  CLOCK_ICON: `${APP_CONFIGS.CDN.URL}/static/Clock_white.json`,
  EYE_ICON: `${APP_CONFIGS.CDN.URL}/static/eye.svg`,
  // Profile images
  FEMALE_PROFILE: `${APP_CONFIGS.CDN.URL}/static/Female1.png`,

  // Icons
  FIRE_ICON: `${APP_CONFIGS.CDN.URL}/static/Fire.json`,
  MALE_PROFILE_1: `${APP_CONFIGS.CDN.URL}/static/male1.png`,
  MALE_PROFILE_2: `${APP_CONFIGS.CDN.URL}/static/male2.png`,
} as const;
