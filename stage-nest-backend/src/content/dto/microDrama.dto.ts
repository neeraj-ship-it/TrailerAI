export enum MicroDramaAction {
  LIKE = 'like',
}

export interface ToggleMicroDramaLikeRequestDto {
  action: MicroDramaAction;
  episodeSlug: string;
  showSlug: string;
}

export interface ToggleMicroDramaLikeResponseDto {
  success: boolean;
}
