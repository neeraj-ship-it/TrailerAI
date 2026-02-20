import { Lang } from 'common/enums/app.enum';
import { EnvironmentEnum } from 'common/enums/common.enums';

export const WEB_CONSTANTS = {
  baseUrl:
    process.env.NODE_ENV === EnvironmentEnum.PRODUCTION
      ? 'https://stage.in'
      : 'https://development.stage.in',
  Lang: {
    [Lang.EN]: 'en',
    [Lang.HIN]: 'hi',
  },
};
