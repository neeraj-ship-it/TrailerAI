import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { Errors } from '@app/error-handler';

import { Episode } from '../../../common/entities/episode.entity'; // Import Episode type
import { Show } from '../../../common/entities/show-v2.entity'; // Assuming this is the correct type for the show object

import { Seasons } from '../entities/seasons.entity'; // Import Season type
import { thumbnailSchema } from '../schemas/base.schema';
import {
  contentThumbnailSchema,
  publishableContentSchema,
} from '../schemas/content.schema';
import {
  publishableEpisodeSchema,
  publishableMicrodramaEpisodeSchema,
  validActiveEpisodeSchema,
} from '../schemas/episode.schema';
import { publishableMovieSchema } from '../schemas/movie.schema';
import {
  publishableSeasonSchema,
  publishableShowSchema,
  validActiveSeasonSchema,
  validActiveShowSchema,
} from '../schemas/show.schema';
import {
  Contents,
  ContentFormat,
  Thumbnail,
} from 'common/entities/contents.entity';
import { Thumbnail as EpisodeThumbnail } from 'common/entities/episode.entity';
import { ShowThumbnail as ShowThumbnail } from 'common/entities/show-v2.entity';

// Helper function to format field names from Zod paths
function formatFieldName(path: string): string {
  // Enhanced map for clearer names
  const fieldMap: Record<string, string> = {
    allThumbnails: 'Thumbnails',
    artistList: 'Artist Information', // More general
    categoryList: 'Category List',
    'character.en': 'English Character Name',
    'character.hin': 'Hindi Character Name',
    complianceList: 'Compliance List',
    contentId: 'Content ID',
    contentType: 'Content Type',
    dialect: 'Dialect',
    duration: 'Duration',
    genres: 'Genres',
    hlsSourceLink: 'HLS Source Link',
    'horizontal.ratio_16_9': '16:9 Horizontal Thumbnail',
    'horizontal.ratio_7_2': '7:2 Horizontal Thumbnail',
    isExclusiveOrder: 'Exclusive Order',
    keywordSearch: 'Keyword Search',
    language: 'Language',
    mediaAccessTier: 'Media Access Tier',
    mediaList: 'Media Items', // More general
    rawMediaId: 'Raw Media ID',
    releaseDate: 'Release Date',
    role: 'Artist Role',
    selectedPeripheral: 'Trailer/Peripheral Information', // Map this parent
    sourcedFrom: 'Sourced From',
    sourceLink: 'Source Link',
    'square.ratio_1_1': 'Square Thumbnail',
    status: 'Status',
    subGenres: 'Sub Genres',
    'subtitle.en': 'English Subtitle',
    'subtitle.hin': 'Hindi Subtitle',
    thumbnail: 'Thumbnail', // Map nested thumbnail generic
    title: 'Title',
    type: 'Type',
    'vertical.ratio_2_3': 'Vertical Thumbnail',
    videoFormatDetail: 'Video Format Detail',
    viewCount: 'View Count',
    visionularHls: 'HLS Encoding',
    visionularHlsH265: 'H265 Encoding',
    visionularTaskId: 'Visionular Task ID',
    // Add more mappings as needed
  };

  const parts = path.split('.');
  let fieldName = path; // Default

  // Iterate backwards to find the most specific match, ignoring numbers
  for (let i = parts.length - 1; i >= 0; i--) {
    const relevantParts = parts.slice(i).filter((p) => isNaN(Number(p)));
    if (relevantParts.length === 0) continue;

    const currentPathKey = relevantParts.join('.');
    if (fieldMap[currentPathKey]) {
      fieldName = fieldMap[currentPathKey];
      break;
    }

    // Check individual last part if full path didn't match
    const lastPart = relevantParts[relevantParts.length - 1];
    if (fieldMap[lastPart]) {
      fieldName = fieldMap[lastPart];
      // If it's a generic term like 'Thumbnail' inside a known parent, try to prefix it
      if (
        parts.length > 1 &&
        ['horizontal', 'square', 'thumbnail', 'vertical'].includes(lastPart)
      ) {
        const parentKey = parts
          .slice(0, parts.length - relevantParts.length)
          .filter((p) => isNaN(Number(p)))
          .pop();
        if (
          parentKey &&
          fieldMap[parentKey] &&
          !fieldName.startsWith(fieldMap[parentKey])
        ) {
          // Add context like "Artist Thumbnail" or "Media Item Thumbnail"
          // Be careful not to double prefix, e.g., "Thumbnails Thumbnail"
          if (fieldMap[parentKey] !== 'Thumbnails') {
            fieldName = `${fieldMap[parentKey]} ${fieldName}`;
          }
        }
      }
      break;
    }
  }

  // Fallback if no mapping found - use the last non-numeric part
  if (fieldName === path) {
    const lastMeaningfulPart = parts.filter((p) => isNaN(Number(p))).pop();
    if (lastMeaningfulPart) {
      fieldName = lastMeaningfulPart.replace(/([A-Z])/g, ' $1').trim();
    } else {
      fieldName = 'Field'; // Absolute fallback
    }
  }

  // Simple capitalization
  return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

function formatValidationError(error: unknown): string {
  let errorMessage = 'Unknown validation error';

  if (error instanceof z.ZodError) {
    errorMessage = error.errors
      .map((e) => {
        if (e.message === 'Required') {
          return `${formatFieldName(e.path.join('.'))} is required`;
        }
        const pathMatch = e.message.match(/^.*? at `(.*?)`/);
        if (pathMatch && pathMatch[1]) {
          return `${formatFieldName(pathMatch[1])}: ${e.message.replace(pathMatch[0], '').trim()}`;
        }
        return e.message;
      })
      .filter((msg, index, self) => self.indexOf(msg) === index)
      .join('\n');
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  return errorMessage;
}

export function validateShowForPublishing(show: Show): void {
  try {
    publishableShowSchema.parse(show.toObject());
  } catch (error) {
    console.error(error);
    throw Errors.CMS.INVALID_CONTENT_DATA(formatValidationError(error));
  }
}

export function safeValidateShow(
  show: Show,
): z.SafeParseReturnType<
  z.infer<typeof validActiveShowSchema>,
  z.input<typeof validActiveShowSchema>
> {
  return validActiveShowSchema.safeParse(show.toObject());
}

export function validateSeasonForPublishing(season: Seasons): void {
  try {
    publishableSeasonSchema.parse(season.toObject());
  } catch (error) {
    console.error(error);
    throw Errors.CMS.INVALID_CONTENT_DATA(formatValidationError(error));
  }
}

export function safeValidateSeason(
  season: Seasons,
): z.SafeParseReturnType<
  z.infer<typeof validActiveSeasonSchema>,
  z.input<typeof validActiveSeasonSchema>
> {
  return validActiveSeasonSchema.safeParse(season.toObject());
}

export function validateEpisodeForPublishing(
  episode: Episode,
  format: ContentFormat,
): void {
  try {
    if (format === ContentFormat.MICRO_DRAMA) {
      publishableMicrodramaEpisodeSchema.parse(episode.toObject());
    } else {
      publishableEpisodeSchema.parse(episode.toObject());
    }
  } catch (error) {
    console.error(error);
    throw Errors.CMS.INVALID_CONTENT_DATA(formatValidationError(error));
  }
}

export function safeValidateEpisode(
  episode: Episode,
): z.SafeParseReturnType<
  z.infer<typeof validActiveEpisodeSchema>,
  z.input<typeof validActiveEpisodeSchema>
> {
  return validActiveEpisodeSchema.safeParse(episode.toObject());
}

export function validateMovieForPublishing(movie: Episode): void {
  try {
    publishableMovieSchema.parse(movie.toObject());
  } catch (error) {
    console.error(error);
    throw Errors.CMS.INVALID_CONTENT_DATA(formatValidationError(error));
  }
}

export function validateContentForPublishing(content: Contents): void {
  try {
    publishableContentSchema.parse(content.toObject());
  } catch (error) {
    console.error(error);
    throw Errors.CMS.INVALID_CONTENT_DATA(formatValidationError(error));
  }
}

export function validateContentThumbnailForPublishing(
  thumbnail: Thumbnail,
): void {
  try {
    contentThumbnailSchema.parse(thumbnail);
  } catch (error) {
    throw new BadRequestException(formatValidationError(error));
  }
}

export function validateLegacyContentThumbnailForPublishing(
  thumbnail: ShowThumbnail | EpisodeThumbnail,
): void {
  try {
    thumbnailSchema.parse(thumbnail);
  } catch (error) {
    throw new BadRequestException(formatValidationError(error));
  }
}
