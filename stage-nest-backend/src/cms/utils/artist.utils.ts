import { ArtistEntityDto, ArtistV2 } from '../dtos/content.dto';
import { Lang } from '@app/common/enums/app.enum';
import { ArtistV2 as ArtistEntity } from 'common/entities/artist-v2.entity';

/**
 * Enriches raw artist data with additional fields from payload
 * Handles the common pattern of matching artists by slug and adding character/role/type info
 */
export function enrichArtistData(
  rawArtists: ArtistEntity[],
  artistPayload: ArtistV2[],
): ArtistEntityDto[] {
  const enrichedArtists: ArtistEntityDto[] = [];

  rawArtists.forEach((artist) => {
    const matches = artistPayload.filter((a) => a.slug === artist.slug);
    matches.forEach((dto) => {
      enrichedArtists.push({
        ...artist,
        character: dto?.character || { en: '', hin: '' },
        role: dto?.role || '',
        type: dto?.type || '',
      });
    });
  });

  return enrichedArtists;
}

/**
 * Converts artist data to legacy format for backward compatibility
 * Used when interfacing with legacy systems that expect the old artist format
 */
export function convertArtistToLegacyFormat(
  artist: ArtistEntityDto,
  index: number,
  language: Lang = Lang.EN,
): {
  callingName: string;
  characterName: string;
  city: string;
  display: string;
  firstName: string;
  gender: string;
  id: number;
  lastName: string;
  name: string;
  order: number;
  profilePic: string;
  slug: string;
  status: string;
} {
  const isEnglish = language === Lang.EN;
  const name = isEnglish ? artist.name.en : artist.name.hin;
  const characterName = isEnglish ? artist.character.en : artist.character.hin;

  return {
    callingName: '',
    characterName,
    city: '',
    display: name,
    firstName: name,
    gender: '',
    id: index,
    lastName: name,
    name,
    order: index,
    profilePic: '',
    slug: artist.slug,
    status: artist.status,
  };
}

/**
 * Converts an array of artists to legacy format
 * Convenient wrapper for converting multiple artists at once
 */
export function convertArtistsToLegacyFormat(
  artists: ArtistEntityDto[],
  language: Lang = Lang.EN,
): {
  callingName: string;
  characterName: string;
  city: string;
  display: string;
  firstName: string;
  gender: string;
  id: number;
  lastName: string;
  name: string;
  order: number;
  profilePic: string;
  slug: string;
  status: string;
}[] {
  return artists.map((artist, index) =>
    convertArtistToLegacyFormat(artist, index, language),
  );
}
