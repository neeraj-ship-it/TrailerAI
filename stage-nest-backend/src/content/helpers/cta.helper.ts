import { Lang } from 'common/enums/app.enum';

import { PROGRESS_THRESHOLDS } from '../constants/cta.constants';

import { CONTECT_DETAILS_CTA_CONSTANTS } from '../constants/cta.constants';
import { IEpisode } from '../dto/getShowDetails.response.dto';

export const createCtaForMovie = async (
  lapsedPercent: number,
  language: Lang,
) => {
  if (lapsedPercent <= PROGRESS_THRESHOLDS.MINIMAL_PROGRESS) {
    return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching}`;
  }
  if (
    lapsedPercent > PROGRESS_THRESHOLDS.MINIMAL_PROGRESS &&
    lapsedPercent < PROGRESS_THRESHOLDS.NEAR_COMPLETION
  ) {
    return `${CONTECT_DETAILS_CTA_CONSTANTS[language].continueWatching}`;
  }
  if (lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION) {
    return `${CONTECT_DETAILS_CTA_CONSTANTS[language].watchAgain}`;
  }
  return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching}`;
};

export const createCtaForShow = async (
  lastEpisodeSlug: string | null,
  lastSeasonSlug: string | null,
  paginatedEpisodes: IEpisode[],
  seasonList: {
    episodeCount: number;
    id: number;
    isNew: boolean;
    seasonOrder: number;
    slug: string;
  }[],
  language: Lang,
) => {
  const lastEpisode = paginatedEpisodes.find(
    (episode) => episode.slug === lastEpisodeSlug,
  );
  const lastSeason = seasonList.find(
    (season) => season.slug === lastSeasonSlug,
  );

  // Determine the scenario based on episode and progress
  let scenario: string;

  if (!lastEpisode) {
    scenario = 'NO_EPISODE';
  } else if (
    lastEpisode.lapsedPercent <= PROGRESS_THRESHOLDS.MINIMAL_PROGRESS
  ) {
    scenario = 'MINIMAL_PROGRESS';
  } else if (
    lastEpisode.lapsedPercent > PROGRESS_THRESHOLDS.MINIMAL_PROGRESS &&
    lastEpisode.lapsedPercent < PROGRESS_THRESHOLDS.NEAR_COMPLETION
  ) {
    scenario = 'CONTINUE_WATCHING';
  } else if (
    lastEpisode.lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION &&
    lastEpisode.episodeOrder < (lastSeason?.episodeCount ?? 0)
  ) {
    scenario = 'NEXT_EPISODE';
  } else if (
    lastEpisode.lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION &&
    lastEpisode.episodeOrder === lastSeason?.episodeCount &&
    lastSeason?.seasonOrder < seasonList.length
  ) {
    scenario = 'NEXT_SEASON';
  } else if (
    lastEpisode.lapsedPercent >= PROGRESS_THRESHOLDS.NEAR_COMPLETION &&
    lastEpisode.episodeOrder === lastSeason?.episodeCount &&
    lastSeason?.seasonOrder === seasonList.length
  ) {
    scenario = 'WATCH_FROM_BEGINNING';
  } else {
    scenario = 'DEFAULT';
  }

  switch (scenario) {
    case 'NO_EPISODE':
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching} S${lastSeason?.seasonOrder} E1`;

    case 'MINIMAL_PROGRESS':
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching} S${lastSeason?.seasonOrder} E${lastEpisode?.episodeOrder}`;

    case 'CONTINUE_WATCHING':
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].continueWatching} S${lastSeason?.seasonOrder} E${lastEpisode?.episodeOrder}`;

    case 'NEXT_EPISODE':
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching} S${lastSeason?.seasonOrder} E${(lastEpisode?.episodeOrder ?? 0) + 1}`;

    case 'NEXT_SEASON':
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching} S${(lastSeason?.seasonOrder ?? 0) + 1} E1`;

    case 'WATCH_FROM_BEGINNING':
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].watchAgain}`;

    default:
      return `${CONTECT_DETAILS_CTA_CONSTANTS[language].startWatching}`;
  }
};
