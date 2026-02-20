import { ShortlinkResponse } from 'common/dtos/appsflyer.dto';

export interface CreateShortlinkRequestDto {
  af_og_description?: string;
  af_og_image?: string;
  af_og_title?: string;
  deepLinkValue: string;
}

export type CreateShortlinkResponseDto = ShortlinkResponse;
