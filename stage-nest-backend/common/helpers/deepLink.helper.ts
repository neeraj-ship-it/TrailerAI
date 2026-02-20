import { Injectable } from '@nestjs/common';

import { AppsflyerDeeplinkRepository } from '../repositories/appsflyerDeeplink.repository';
import { ContentType } from '@app/common/enums/common.enums';
import { APP_CONFIGS } from 'common/configs/app.config';
import {
  CreateDeepLinkParams,
  DeepLinkResponse,
} from 'common/entities/appsflyerDeeplink.entity';
import { ContentFormat } from 'common/entities/contents.entity';
import { AppsFlyerUtils } from 'common/utils/appsflyer.utils';

const { APPSFLYER } = APP_CONFIGS;

@Injectable()
export class DeepLinkHelper {
  constructor(
    private readonly appsflyerUtils: AppsFlyerUtils,
    private readonly appsflyerDeeplinkRepository: AppsflyerDeeplinkRepository,
  ) {}

  private extractDeepLinkId(url: string): string {
    // Extract shortlink ID from URL (e.g., fqle78x8 from https://stage-ott.onelink.me/xGYy/fqle78x8)
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }

  private generateCampaignName(
    contentType: ContentType,
    contentSlug: string,
    format?: ContentFormat,
  ): string {
    if (contentType === ContentType.MOVIE) {
      return `${contentSlug}_${ContentType.MOVIE}`;
    } else {
      return `${contentSlug}_${ContentType.SHOW}_${format}`;
    }
  }

  private generateDeepLinkValue(
    contentType: ContentType,
    contentId: number | string,
    dialect: string,
    lang: string,
    format?: ContentFormat,
  ): string {
    const baseUrl = 'stage://appsflyer';

    if (contentType === ContentType.MOVIE) {
      return `${baseUrl}/${dialect}/${lang}/video?episodeId=${contentId}`;
    } else {
      if (format === ContentFormat.MICRO_DRAMA) {
        return `${baseUrl}/${dialect}/${lang}/microDrama?showId=${contentId}`;
      } else {
        return `${baseUrl}/${dialect}/${lang}/show?showId=${contentId}`;
      }
    }
  }

  async createOrRefreshDeepLink(
    params: CreateDeepLinkParams,
  ): Promise<DeepLinkResponse> {
    const { contentId, contentType, dialect, format, lang, slug } = params;
    try {
      // Generate campaign and deep link value
      const campaign = this.generateCampaignName(contentType, slug, format);
      const deepLinkValue = this.generateDeepLinkValue(
        contentType,
        contentId,
        dialect,
        lang,
        format,
      );
      // Check if deep link exists
      const existingDeepLink =
        await this.appsflyerDeeplinkRepository.findByContentAndLocale(
          contentId,
          contentType,
        );

      if (existingDeepLink) {
        // Check if we need to refresh (older than 25 days)
        if (this.shouldRefreshDeepLink(existingDeepLink.lastRefreshedAt)) {
          // Update existing shortlink with PUT API
          const updateResult = await this.appsflyerUtils.updateShortlink({
            campaign,
            deepLinkValue,
            shortlinkId: existingDeepLink.deepLinkId,
            ttl: '31d',
          });
          if (updateResult.success && updateResult.data) {
            const updatedDeepLink = {
              appsflyerUrl: updateResult.data.short_url,
              deepLinkId: existingDeepLink.deepLinkId,
              lastRefreshedAt: new Date(),
            };

            await this.appsflyerDeeplinkRepository.createOrUpdateDeeplink(
              contentId,
              contentType,
              slug,
              updatedDeepLink,
              dialect,
              lang,
              format,
            );
            return {
              appsflyerUrl: updatedDeepLink.appsflyerUrl,
              deepLinkId: updatedDeepLink.deepLinkId,
              lastRefreshedAt: updatedDeepLink.lastRefreshedAt,
              success: true,
            };
          } else {
            return {
              error_message: updateResult.error_message,
              success: false,
            };
          }
        } else {
          // Return existing deep link (still fresh)
          return {
            appsflyerUrl: existingDeepLink.appsflyerUrl,
            deepLinkId: existingDeepLink.deepLinkId,
            lastRefreshedAt: existingDeepLink.lastRefreshedAt,
            success: true,
          };
        }
      } else {
        // Create new shortlink with POST API
        const createResult = await this.appsflyerUtils.createShortlink({
          campaign,
          deepLinkValue,
        });
        if (createResult.success && createResult.data) {
          const deepLinkId = this.extractDeepLinkId(
            createResult.data.short_url,
          );
          const newDeepLink = {
            appsflyerUrl: createResult.data.short_url,
            createdAt: new Date(),
            deepLinkId,
            lastRefreshedAt: new Date(),
          };

          await this.appsflyerDeeplinkRepository.createOrUpdateDeeplink(
            contentId,
            contentType,
            slug,
            newDeepLink,
            dialect,
            lang,
            format,
          );

          return {
            appsflyerUrl: newDeepLink.appsflyerUrl,
            createdAt: newDeepLink.createdAt,
            deepLinkId: newDeepLink.deepLinkId,
            lastRefreshedAt: newDeepLink.lastRefreshedAt,
            success: true,
          };
        } else {
          return {
            error_message: createResult.error_message,
            success: false,
          };
        }
      }
    } catch (error) {
      return {
        error_message:
          error instanceof Error
            ? error.message
            : 'Failed to create or refresh deep link',
        success: false,
      };
    }
  }

  public shouldRefreshDeepLink(lastRefreshedAt: Date | string): boolean {
    const today = new Date();
    const lastRefreshDate = new Date(lastRefreshedAt);
    const daysDifference = Math.floor(
      (today.getTime() - lastRefreshDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysDifference > APPSFLYER.DEEPLINK_REFRESH_DAYS;
  }
}
