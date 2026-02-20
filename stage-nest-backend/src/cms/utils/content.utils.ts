import { SubtitleResponseDTO } from '../dtos/content.dto';
import { ISubtitle } from '../interfaces/content.interface';
import {
  GenerationMethod,
  Subtitle,
  SubtitleMetadata,
  SubtitleStatus,
} from 'common/entities/show-v2.entity';

const createManualSubtitleMetadata = (
  status: SubtitleStatus,
): SubtitleMetadata => ({
  lastModified: new Date(),
  method: GenerationMethod.MANUAL,
  status,
});

export const updateSubtitleMetadataOnChanges = ({
  currentSubtitle,
  localUpload,
  newEnFile,
  newHinFile,
}: {
  currentSubtitle: ISubtitle | null;
  newEnFile?: string | null;
  newHinFile?: string | null;
  localUpload: boolean;
}): Subtitle => {
  const enChanged = currentSubtitle?.en !== newEnFile;
  const hinChanged = currentSubtitle?.hin !== newHinFile;

  const hasEnDeleted = enChanged && !newEnFile;
  const hasHinDeleted = hinChanged && !newHinFile;

  return {
    en: newEnFile ?? '',
    enMetadata: hasEnDeleted
      ? createManualSubtitleMetadata(SubtitleStatus.DELETED)
      : enChanged
        ? null
        : currentSubtitle?.enMetadata || null,
    hin: newHinFile ?? '',
    hinMetadata: hasHinDeleted
      ? createManualSubtitleMetadata(SubtitleStatus.DELETED)
      : hinChanged && localUpload
        ? null
        : currentSubtitle?.hinMetadata || null,
  };
};

export const transformSubtitleToDto = (
  subtitle: Subtitle | null,
): SubtitleResponseDTO | null => {
  if (!subtitle) {
    return null;
  }

  return {
    en: subtitle.en,
    enMetadata: subtitle.enMetadata
      ? { status: subtitle.enMetadata.status }
      : null,
    hin: subtitle.hin,
    hinMetadata: subtitle.hinMetadata
      ? { status: subtitle.hinMetadata.status }
      : null,
  };
};

export const transformSubtitleFromDto = (
  subtitleDto: SubtitleResponseDTO | null,
): Subtitle | null => {
  if (!subtitleDto) {
    return null;
  }
  return {
    en: subtitleDto.en,
    enMetadata: subtitleDto.enMetadata
      ? createManualSubtitleMetadata(subtitleDto.enMetadata.status)
      : null,
    hin: subtitleDto.hin,
    hinMetadata: subtitleDto.hinMetadata
      ? createManualSubtitleMetadata(subtitleDto.hinMetadata.status)
      : null,
  };
};
