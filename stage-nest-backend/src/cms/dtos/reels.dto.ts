import { MediaStatusEnum } from '@app/common/entities/raw-media.entity';
import { ReelStatusEnum, ReelType } from '@app/common/entities/reel.entity';
import { Lang } from '@app/common/enums/app.enum';

export interface CreateOrUpdateReelRequestDto {
  contentSlug: string;
  description: {
    [Lang.EN]: string;
    [Lang.HIN]: string;
  };
  id?: string;
  plotKeywords: {
    [Lang.EN]: string[];
    [Lang.HIN]: string[];
  };
  rawMediaId?: string;
  reelType: ReelType;
  title: {
    [Lang.EN]: string;
    [Lang.HIN]: string;
  };
}

export interface ReelResponseDto {
  contentSlug: string;
  description: {
    [Lang.EN]: string;
    [Lang.HIN]: string;
  };
  id: string;
  plotKeywords: {
    [Lang.EN]: string[];
    [Lang.HIN]: string[];
  };
  previewUrl: string | null;
  rawMedia: {
    id: string | null;
    status: MediaStatusEnum | null;
  };
  reelType: ReelType;
  status: ReelStatusEnum;
  title: {
    [Lang.EN]: string;
    [Lang.HIN]: string;
  };
}
