import { ContentType } from '../../../common/enums/common.enums';
import { StateCategory } from '../../../common/schema/specialAccess.schema';

export interface CreateUserSpecialStateRequestDto {
  content_id: number;
  content_type: ContentType;
}

export interface UpdateUserSpecialStateRequestDto {
  state_category: StateCategory;
  state_value: number;
}

export interface MicrodramaFreePreviewRequestDto {
  content_id: number;
}
