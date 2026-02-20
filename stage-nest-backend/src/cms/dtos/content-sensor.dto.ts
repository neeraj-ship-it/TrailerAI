import { ContentTypeV2 } from 'common/enums/common.enums';

export interface ContentSensorItem {
  contentType: ContentTypeV2;
  isAudienceAdded: boolean;
  slug: string;
  thumbnail: string;
  title: string;
}
