import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';

import { APP_CONFIGS } from '../configs/app.config';
import { handleAxiosErrorLog } from './helpers';
import { ErrorHandlerService } from '@app/error-handler';
import {
  IAppsFlyerShortlinkParams,
  IAppsFlyerShortlinkPayload,
  IAppsFlyerUpdateShortlinkParams,
  ShortlinkResponse,
} from 'common/dtos/appsflyer.dto';

const { APPSFLYER } = APP_CONFIGS;

@Injectable()
export class AppsFlyerUtils {
  private readonly appsflyerApiUrl = APPSFLYER.SHORTLINK_BASE_URL;
  private axiosInstance: AxiosInstance;
  private readonly shortlinkEndpoint = `${APPSFLYER.SHORTLINK_ENDPOINT}/${APPSFLYER.TEMPLATE_ID}`;

  constructor(private readonly errorHandler: ErrorHandlerService) {
    this.axiosInstance = axios.create({
      baseURL: this.appsflyerApiUrl,
      headers: {
        authorization: APPSFLYER.API_TOKEN,
        'Content-Type': 'application/json',
      },
    });
  }

  // POST - Create Shortlink
  private createShortlinkPayload(
    params: IAppsFlyerShortlinkParams,
  ): IAppsFlyerShortlinkPayload {
    const {
      af_og_description,
      af_og_image,
      af_og_title,
      campaign,
      deepLinkValue,
    } = params;

    return {
      data: {
        af_dp: APPSFLYER.AF_DP,
        af_og_description: af_og_description,
        af_og_image: af_og_image,
        af_og_title: af_og_title,
        c: campaign,
        deep_link_value: deepLinkValue,
        pid: APPSFLYER.PID,
      },
      renew_ttl: true,
      ttl: APPSFLYER.TTL,
    };
  }

  // PUT - Update Shortlink
  private createUpdateShortlinkPayload(
    params: IAppsFlyerUpdateShortlinkParams,
  ): Partial<IAppsFlyerShortlinkPayload> {
    const { campaign, deepLinkValue, ttl } = params;

    return {
      data: {
        af_dp: APPSFLYER.AF_DP,
        c: campaign,
        deep_link_value: deepLinkValue,
        pid: APPSFLYER.PID,
      },
      renew_ttl: true,
      ttl: ttl || APPSFLYER.TTL,
    };
  }

  async createShortlink(
    params: IAppsFlyerShortlinkParams,
  ): Promise<ShortlinkResponse> {
    const payload = this.createShortlinkPayload(params);

    const [result, error] = await this.errorHandler.try(async () => {
      const res = await this.axiosInstance.post(
        this.shortlinkEndpoint,
        payload,
      );
      return {
        data: {
          short_url: res.data,
        },
        success: true,
      };
    });

    if (error) {
      const axiosError = error as AxiosError;
      const errorLog = handleAxiosErrorLog(axiosError);
      return {
        error_message: errorLog.message || 'Unknown error',
        success: false,
      };
    }

    return (
      result || {
        error_message: 'No result returned',
        success: false,
      }
    );
  }

  async updateShortlink(
    params: IAppsFlyerUpdateShortlinkParams,
  ): Promise<ShortlinkResponse> {
    const { shortlinkId } = params;
    const payload = this.createUpdateShortlinkPayload(params);
    const updateEndpoint = `${this.shortlinkEndpoint}?id=${shortlinkId}`;

    const [result, error] = await this.errorHandler.try(async () => {
      const res = await this.axiosInstance.put(updateEndpoint, payload);
      return {
        data: {
          short_url: res.data,
        },
        success: true,
      };
    });

    if (error) {
      const axiosError = error as AxiosError;
      const errorLog = handleAxiosErrorLog(axiosError);
      return {
        error_message: errorLog.message || 'Unknown error',
        success: false,
      };
    }

    return (
      result || {
        error_message: 'No result returned',
        success: false,
      }
    );
  }
}
