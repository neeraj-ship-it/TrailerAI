import { PromotionClipContentType } from '../interfaces/promotionClip.interface';

export interface PromotionClipRequestDto {
  contentId?: number;
  contentType?: PromotionClipContentType;
}
