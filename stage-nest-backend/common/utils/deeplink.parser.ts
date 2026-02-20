import { CommonUtils } from './common.utils';
import { IDeeplinks } from '@app/admin/content/interface/deeplink.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { DeeplinkContentType } from '@app/common/enums/common.enums';
import { WEB_CONSTANTS } from 'common/constants/web.constants';
import {
  Dialect,
  Lang,
  DeeplinkProvider,
  DialectName,
} from 'common/enums/app.enum';

/**
 * Interface for deeplink query parameters
 */
interface DeeplinkParams {
  episodeId?: number;
  seasonId?: number;
  showId?: number;
}

/**
 * Same fn used in stage-web to generate slug for content
 */
export function generateURLSlug({
  contentId,
  contentName,
  slug,
}: {
  contentName: string;
  slug: string;
  contentId: number;
}): string {
  let generatedSlug = '';

  if (CommonUtils.isStringHindi(contentName) && slug) {
    generatedSlug = slug.trim().replace(/-+/g, '-');
  } else {
    generatedSlug = contentName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  return generatedSlug !== ''
    ? `${generatedSlug}-${contentId}`
    : `${contentId}`;
}

interface WebUrlParams {
  contentId: number;
  contentType: DeeplinkContentType;
  dialect: Dialect;
  language: Lang;
  slug: string;
}

function generateWebPaywallUrl({
  contentId,
  contentType,
  dialect,
  language,
  slug,
}: WebUrlParams): string {
  const {
    BASE_URL: baseUrl,
    PATH: paywallPath,
    QUERY_PARAM: queryParamName,
  } = APP_CONFIGS.DEEPLINK.WEB_PAYWALL;

  const dialectName = DialectName[dialect];

  const redirectionPath = `/${contentType}/${slug}`;
  const queryParam = `${queryParamName}=${redirectionPath}`;

  return `${baseUrl}/${WEB_CONSTANTS.Lang[language]}/${dialectName}/${paywallPath}?${queryParam}&contentType=${contentType}&contentId=${contentId}`;
}

function generateContentWebUrl({
  contentId,
  contentType,
  dialect,
  language,
  slug,
}: WebUrlParams): string {
  const { BASE_URL: baseUrl } = APP_CONFIGS.DEEPLINK.WEB_PAYWALL;
  const dialectName = DialectName[dialect];

  return `${baseUrl}/${WEB_CONSTANTS.Lang[language]}/${dialectName}/${contentType}/${slug}?contentType=${contentType}&contentId=${contentId}`;
}

/**
 * Builds query string from parameters object
 */
function buildQueryString(params: DeeplinkParams): string {
  const queryParams = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`)
    .join('&');

  return queryParams ? `?${queryParams}` : '';
}

/**
 * Generates a deeplink URL for the specified provider
 */
export function generateDeeplink(
  provider: DeeplinkProvider,
  dialect: Dialect,
  language: Lang,
  contentType: string,
  params: DeeplinkParams,
): string {
  const baseUrl = APP_CONFIGS.DEEPLINK.BASE_URL;
  let providerName: string;
  switch (provider) {
    case DeeplinkProvider.META:
      providerName = APP_CONFIGS.DEEPLINK.PROVIDERS.META;
      break;
    case DeeplinkProvider.GOOGLE:
      providerName = APP_CONFIGS.DEEPLINK.PROVIDERS.GOOGLE;
      break;
    default:
      throw new Error(`Unknown deeplink provider: ${provider}`);
  }

  const queryString = buildQueryString(params);

  return `${baseUrl}${providerName}/${dialect}/${language}/${contentType}${queryString}`;
}

/**
 * Generates deeplinks for microDrama content
 */
export function generateMicroDramaDeeplinks(
  dialect: Dialect,
  language: Lang,
  showId: number,
  contentName: string,
  slug: string,
): IDeeplinks {
  const params = {
    [APP_CONFIGS.DEEPLINK.QUERY_PARAMS.SHOW_ID]: showId,
  };

  const generatedSlug = generateURLSlug({
    contentId: showId,
    contentName,
    slug,
  });

  const webUrlParams: WebUrlParams = {
    contentId: showId,
    contentType: DeeplinkContentType.MICRO_DRAMA,
    dialect,
    language,
    slug: generatedSlug,
  };

  return {
    contentWebLink: generateContentWebUrl(webUrlParams),
    googleAppLink: generateDeeplink(
      DeeplinkProvider.GOOGLE,
      dialect,
      language,
      APP_CONFIGS.DEEPLINK.CONTENT_TYPES.MICRO_DRAMA,
      params,
    ),
    metaAppLink: generateDeeplink(
      DeeplinkProvider.META,
      dialect,
      language,
      APP_CONFIGS.DEEPLINK.CONTENT_TYPES.MICRO_DRAMA,
      params,
    ),
    webPaywallLink: generateWebPaywallUrl(webUrlParams),
  };
}

/**
 * Generates deeplinks for movie content
 */
export function generateMovieDeeplinks(
  dialect: Dialect,
  language: Lang,
  episodeId: number,
  contentName: string,
  slug: string,
): IDeeplinks {
  const params = {
    [APP_CONFIGS.DEEPLINK.QUERY_PARAMS.EPISODE_ID]: episodeId,
  };

  const generatedSlug = generateURLSlug({
    contentId: episodeId,
    contentName,
    slug,
  });

  const webUrlParams: WebUrlParams = {
    contentId: episodeId,
    contentType: DeeplinkContentType.MOVIE,
    dialect,
    language,
    slug: generatedSlug,
  };

  return {
    contentWebLink: generateContentWebUrl(webUrlParams),
    googleAppLink: generateDeeplink(
      DeeplinkProvider.GOOGLE,
      dialect,
      language,
      APP_CONFIGS.DEEPLINK.CONTENT_TYPES.MOVIE,
      params,
    ),
    metaAppLink: generateDeeplink(
      DeeplinkProvider.META,
      dialect,
      language,
      APP_CONFIGS.DEEPLINK.CONTENT_TYPES.MOVIE,
      params,
    ),
    webPaywallLink: generateWebPaywallUrl(webUrlParams),
  };
}

/**
 * Generates deeplinks for show content
 */
export function generateShowDeeplinks(
  dialect: Dialect,
  language: Lang,
  showId: number,
  seasonId: number,
  episodeId: number,
  contentName: string,
  slug: string,
): IDeeplinks {
  const params = {
    [APP_CONFIGS.DEEPLINK.QUERY_PARAMS.EPISODE_ID]: episodeId,
    [APP_CONFIGS.DEEPLINK.QUERY_PARAMS.SEASON_ID]: seasonId,
    [APP_CONFIGS.DEEPLINK.QUERY_PARAMS.SHOW_ID]: showId,
  };

  const generatedSlug = generateURLSlug({
    contentId: showId,
    contentName,
    slug,
  });

  const webUrlParams: WebUrlParams = {
    contentId: showId,
    contentType: DeeplinkContentType.SHOW,
    dialect,
    language,
    slug: generatedSlug,
  };

  return {
    contentWebLink: generateContentWebUrl(webUrlParams),
    googleAppLink: generateDeeplink(
      DeeplinkProvider.GOOGLE,
      dialect,
      language,
      APP_CONFIGS.DEEPLINK.CONTENT_TYPES.SHOW,
      params,
    ),
    metaAppLink: generateDeeplink(
      DeeplinkProvider.META,
      dialect,
      language,
      APP_CONFIGS.DEEPLINK.CONTENT_TYPES.SHOW,
      params,
    ),
    webPaywallLink: generateWebPaywallUrl(webUrlParams),
  };
}
