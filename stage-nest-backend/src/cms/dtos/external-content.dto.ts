import { ContentFormat } from 'common/entities/contents.entity';
import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

export class PublishEpisodeDto {
  contentType!: ContentTypeV2;
  dialect!: Dialect;
  format!: ContentFormat;
  slug!: string;
}
