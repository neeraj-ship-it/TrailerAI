import { ContentType, ContentTypeV2 } from '@app/common/enums/common.enums';
import { CombinedPlatterType } from 'common/entities/combined-platter.entity';
import { Dialect } from 'common/enums/app.enum';

export interface PlatterThumbnail {
  horizontal: string;
  square: string;
}

export interface PlatterContentDTO {
  id: number;
  slug: string;
  thumbnail: PlatterThumbnail;
  title: string;
  type: ContentTypeV2;
}

export interface UpdatePlatterDTO {
  contents: {
    slug: string;
    type: ContentType.SHOW | ContentType.MOVIE;
  }[];
  dialect: Dialect;
  platterType: CombinedPlatterType;
}
