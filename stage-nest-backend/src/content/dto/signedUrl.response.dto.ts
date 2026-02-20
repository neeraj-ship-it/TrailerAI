import { Episode } from '../entities/episodes.entity';
import { SignedCookies } from '@app/storage';

export interface SignedObject {
  signedCookies: SignedCookies;
  signedUrl: string;
  url: string;
}

export interface SignedUrlResponseDto {
  cdnType: string;
  signedObject?: SignedObject;
  signedObjectH265?: SignedObject;
  signedUrl: string;
  signedUrlH265: string;
}

export interface SpecialAccessSignedUrlResponseDto {
  data: SignedUrlResponseDto;
  responseMessage: string;
}

export interface EpisodeSignedUrlData {
  signedCookies: SignedCookies;
  signedObject: SignedObject;
  signedObjectH265: SignedObject;
}

export interface BatchSignedUrlResponseDto {
  cdnType: string;
  episodes: Record<number, EpisodeSignedUrlData>;
  expirationTime: number;
  expiresInSeconds: number;
  slug: string;
}

export interface BatchSignedUrlWrappedResponseDto {
  data: BatchSignedUrlResponseDto;
}

export interface ShowEpisodesResult {
  episodes: Pick<
    Episode,
    | '_id'
    | 'freeEpisode'
    | 'visionularHls'
    | 'visionularHlsH265'
    | 'showSlug'
    | 'showId'
    | 'slug'
  >[];
  folderPathH265: string;
  folderPathHLS: string;
  slug: string;
}

export interface IndividualEpisodeResult {
  episodes: Pick<
    Episode,
    '_id' | 'freeEpisode' | 'visionularHls' | 'visionularHlsH265' | 'slug'
  >[];
  folderPathH265: string;
  folderPathHLS: string;
  slug: string;
}
