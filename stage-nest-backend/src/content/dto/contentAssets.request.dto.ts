import { FeatureEnum } from '@app/common/entities/assetsV2.entity';
import { ContentAssetContentType } from 'common/schema/contentAssets.schema';

export interface ContentAssetsRequestDto {
  assetType: FeatureEnum;
  contentId: number;
  contentType: ContentAssetContentType;
}
