import { Thumbnail } from '../schemas/thumbnail.schema';
import { Peripheral } from './peripheral.dto';
import { ThumbnailWithRatioDto } from './thumbnail.dto';
import { ShowStatus } from 'common/entities/show-v2.entity';
import { Dialect, Lang } from 'common/enums/app.enum';
export interface ShowDto {
  _id: number;
  chatbotFab: boolean;
  description: string;
  displayLanguage: Lang;
  isComingSoon?: boolean;
  isPremium: boolean;
  language: Dialect;
  selectedPeripheral?: Peripheral;
  slug: string;
  status?: ShowStatus;
  thumbnail: ThumbnailWithRatioDto;
  title: string;
  upcomingScheduleText?: string;
}

export interface ShowDetailsBySlugDto {
  _id: number;
  thumbnail: Thumbnail;
  title: string;
}
