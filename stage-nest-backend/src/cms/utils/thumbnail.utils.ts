import {
  IMediaItem,
  IContentMediaItem,
  ThumbnailDTO,
} from '../dtos/content.dto';
import {
  AllThumbnail,
  MediaItem,
  PeripheralTypeEnum,
} from 'common/entities/contents.entity';
import { Thumbnail } from 'common/entities/episode.entity';
import {
  AllShowThumbnails,
  ShowThumbnail,
} from 'common/entities/show-v2.entity';
import { PeripheralMediaType } from 'common/enums/media.enum';

// Utility function to convert ShowThumbnail to ContentThumbnail
export function convertShowThumbnailToContentThumbnail(
  thumb: AllShowThumbnails | undefined,
): AllThumbnail {
  if (!thumb) {
    return {
      horizontal: {
        ratio_16_9: { gradient: '', sourceLink: '' },
        ratio_7_2: { gradient: '', sourceLink: '' },
        ratio_tv: { gradient: '', sourceLink: '' },
      },
      square: {
        ratio_1_1: { gradient: '', sourceLink: '' },
      },
      vertical: {
        ratio_2_3: { gradient: '', sourceLink: '' },
      },
    };
  }
  const horizontal = thumb.horizontal || {};
  const square = thumb.square || { ratio1: { gradient: '', sourceLink: '' } };
  const vertical = thumb.vertical || {
    ratio1: { gradient: '', sourceLink: '' },
  };
  const verticalRatio1 = vertical.ratio1 || { gradient: '', sourceLink: '' };
  return {
    horizontal: {
      ratio_16_9: horizontal.ratio1 || { gradient: '', sourceLink: '' },
      ratio_7_2: horizontal.ratio4 || { gradient: '', sourceLink: '' },
      ratio_tv: horizontal.ratio3 || { gradient: '', sourceLink: '' },
    },
    id: thumb.id,
    selected: thumb.selected ?? false,
    square: {
      ratio_1_1: square.ratio1 || { gradient: '', sourceLink: '' },
    },
    vertical: {
      ratio_2_3: verticalRatio1,
    },
  };
}

// Utility function to convert ContentThumbnail to ShowThumbnail
export function convertContentThumbnailToShowThumbnail(
  t: AllThumbnail,
): ThumbnailDTO {
  return {
    horizontal: {
      ratio1: {
        gradient: t.horizontal?.ratio_16_9?.gradient ?? '',
        sourceLink: t.horizontal?.ratio_16_9?.sourceLink ?? '',
      },
      ratio2: {
        gradient: '',
        sourceLink: '',
      },
      ratio3: {
        gradient: t.horizontal?.ratio_tv?.gradient ?? '',
        sourceLink: t.horizontal?.ratio_tv?.sourceLink ?? '',
      },
      ratio4: {
        gradient: t.horizontal?.ratio_7_2?.gradient ?? '',
        sourceLink: t.horizontal?.ratio_7_2?.sourceLink ?? '',
      },
    },
    id: t.id,
    square: {
      ratio1: {
        gradient: t.square?.ratio_1_1?.gradient ?? '',
        sourceLink: t.square?.ratio_1_1?.sourceLink ?? '',
      },
    },
    vertical: {
      ratio1: {
        gradient: t.vertical?.ratio_2_3?.gradient ?? '',
        sourceLink: t.vertical?.ratio_2_3?.sourceLink ?? '',
      },
    },
  };
}

// Utility to convert meta/DTO thumbnail to ShowThumbnail
export function convertThumbnailDTOToShowThumbnail(
  thumbnail: ThumbnailDTO,
  index: number,
): AllShowThumbnails {
  return {
    horizontal: {
      ratio1: {
        gradient: thumbnail.horizontal.ratio1?.gradient || '',
        sourceLink: thumbnail.horizontal.ratio1?.sourceLink || '',
      },
      ratio2: {
        gradient: thumbnail.horizontal.ratio2?.gradient || '',
        sourceLink: thumbnail.horizontal.ratio2?.sourceLink || '',
      },
      ratio3: {
        gradient: thumbnail.horizontal.ratio3?.gradient || '',
        sourceLink: thumbnail.horizontal.ratio3?.sourceLink || '',
      },
      ratio4: {
        gradient: thumbnail.horizontal.ratio4?.gradient || '',
        sourceLink: thumbnail.horizontal.ratio4?.sourceLink || '',
      },
    },
    id: thumbnail.id || index + 1,
    square: {
      ratio1: {
        gradient: thumbnail.square.ratio1?.gradient || '',
        sourceLink: thumbnail.square.ratio1?.sourceLink || '',
      },
    },
    vertical: {
      ratio1: {
        gradient: thumbnail.vertical.ratio1?.gradient || '',
        sourceLink: thumbnail.vertical.ratio1?.sourceLink || '',
      },
    },
  };
}

// Helper to map episode thumbnail to ThumbnailResponseDTO
export function convertEpisodeThumbnailToShowThumbnail(
  t: ShowThumbnail,
): ThumbnailDTO {
  return {
    horizontal: {
      ratio1: {
        gradient: t.horizontal?.ratio1?.gradient ?? '',
        sourceLink: t.horizontal?.ratio1?.sourceLink ?? '',
      },
      ratio2: t.horizontal?.ratio2
        ? {
            gradient: t.horizontal.ratio2.gradient ?? '',
            sourceLink: t.horizontal.ratio2.sourceLink ?? '',
          }
        : undefined,
    },
    id: undefined,
    square: {
      ratio1: {
        gradient: t.square?.ratio1?.gradient ?? '',
        sourceLink: t.square?.ratio1?.sourceLink ?? '',
      },
    },
    vertical: {
      ratio1: {
        gradient: t.vertical?.ratio1?.gradient ?? '',
        sourceLink: t.vertical?.ratio1?.sourceLink ?? '',
      },
    },
  };
}

// Utility to convert meta/DTO trailer to MediaList
export function convertMetaTrailerToMediaList({
  index,
  originalTrailer,
  updatedTrailer,
}: {
  updatedTrailer: Partial<MediaItem>;
  index: number;
  showMediaId?: string;
  originalTrailer: MediaItem;
}): MediaItem {
  return {
    ...originalTrailer,
    description: updatedTrailer.description ?? originalTrailer.description,
    id: updatedTrailer.id ?? index + 1,
    mediaType: updatedTrailer.mediaType ?? originalTrailer.mediaType,
    rawMediaId: updatedTrailer.rawMediaId ?? originalTrailer.rawMediaId,
    selectedPeripheralStatus:
      (updatedTrailer.selectedPeripheralStatus ?? index === 0) ? true : false,
    thumbnail: {
      ...originalTrailer.thumbnail,
      horizontal: {
        ...originalTrailer.thumbnail.horizontal,
        sourceLink: updatedTrailer.thumbnail?.horizontal?.sourceLink ?? '',
      },
      square: {
        ...originalTrailer.thumbnail.square,
        sourceLink: updatedTrailer.thumbnail?.square?.sourceLink ?? '',
      },
      vertical: {
        ...originalTrailer.thumbnail.vertical,
        sourceLink: updatedTrailer.thumbnail?.vertical?.sourceLink ?? '',
      },
    },
    title: updatedTrailer.title ?? originalTrailer.title,
    type: updatedTrailer.type ?? PeripheralTypeEnum.SHOW_PERIPHERAL,
  };
}

// Utility to convert meta/DTO trailer to Peripheral
export function convertMetaTrailerToPeripheral(
  trailer: IMediaItem,
  showMediaId?: string,
): IContentMediaItem {
  return {
    ...trailer,
    description: trailer?.description || '',
    id: trailer.id || 1,
    mediaType: PeripheralMediaType.TRAILER,
    rawMediaId: trailer.rawMediaId || '',
    rawMediaStatus: trailer.rawMediaStatus || null,
    sourceLink: trailer.sourceLink || '',
    thumbnail: {
      ...trailer.thumbnail,
      horizontal: {
        ...trailer.thumbnail.horizontal,
        sourceLink: trailer.thumbnail?.horizontal?.sourceLink ?? '',
      },
      square: {
        ...trailer.thumbnail.square,
        sourceLink: trailer.thumbnail?.square?.sourceLink ?? '',
      },
      vertical: {
        ...trailer.thumbnail.vertical,
        sourceLink: trailer.thumbnail?.vertical?.sourceLink ?? '',
      },
    },
    title: trailer.title ?? '',
    visionularHls: {
      rawMediaId: showMediaId || '',
    },
    visionularHlsH265: {
      rawMediaId: showMediaId || '',
    },
  };
}

// Utility function to convert ThumbnailDTO to Episode Thumbnail format
export function convertThumbnailDTOToEpisodeThumbnail(
  thumbnail: ThumbnailDTO,
): Thumbnail {
  return {
    horizontal: {
      ratio1: {
        gradient: thumbnail.horizontal.ratio1?.gradient || '',
        sourceLink: thumbnail.horizontal.ratio1?.sourceLink || '',
      },
      ratio2: {
        gradient: thumbnail.horizontal.ratio2?.gradient || '',
        sourceLink: thumbnail.horizontal.ratio2?.sourceLink || '',
      },
      ratio3: {
        gradient: '',
        sourceLink: '',
      },
    },
    square: {
      ratio1: {
        gradient: thumbnail.square.ratio1?.gradient || '',
        sourceLink: thumbnail.square.ratio1?.sourceLink || '',
      },
    },
    vertical: {
      ratio1: {
        gradient: thumbnail.vertical.ratio1?.gradient || '',
        sourceLink: thumbnail.vertical.ratio1?.sourceLink || '',
      },
    },
  };
}

export function getNextMediaItemId(mediaList: MediaItem[]): number {
  if (mediaList.length === 0) {
    return 1;
  }
  const maxId = Math.max(...mediaList.map((m) => m.id || 0));
  return maxId + 1;
}

// Helper function to process trailer arrays into MediaItem arrays
// Handles both create and update scenarios with existing trailer preservation
export function processMediaItemDtoToMediaList(
  trailers: IMediaItem[],
  existingMediaList?: MediaItem[],
): MediaItem[] {
  return trailers
    .map((trailer, index) => {
      const originalTrailer = existingMediaList?.find(
        (item) => item.id === trailer.id,
      );

      if (originalTrailer) {
        return convertMetaTrailerToMediaList({
          index: originalTrailer.id,
          originalTrailer,
          showMediaId: trailer.rawMediaId,
          updatedTrailer: trailer,
        });
      }

      return convertMetaTrailerToMediaList({
        index: index + 1,
        originalTrailer: new MediaItem(),
        showMediaId: trailer.rawMediaId,
        updatedTrailer: trailer,
      });
    })
    .sort((a, b) => a.id - b.id);
}
