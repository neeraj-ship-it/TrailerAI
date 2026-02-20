import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Types } from 'mongoose';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ClientAppIdEnum, OS } from '@app/common/enums/app.enum';
import { getDateIST } from '@app/common/helpers/dateTime.helper';

import { Logger } from '@nestjs/common';

import { UserRepository } from '@app/common/repositories/user.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events';

import {
  FutworkLeadPayload,
  ReceiveLeadUpdateFromFutworkRequestDTO,
  SendLeadtoFutworkRequestDTO,
  FutworkLeadData,
  UpdateLeadOnFutworkRequestDTO,
} from '../dtos/futwork.dto';
import { Events } from '@app/events/interfaces/events.interface';

@Injectable()
export class FutworkService {
  private readonly futworkApiKey = process.env.FUTWORK_API_KEY;
  private readonly futworkLeadPushEndpoint = `${APP_CONFIGS.FUTWORK.API_URL}/leads/push`;
  private readonly futworkLeadUpdateEndpoint = `${APP_CONFIGS.FUTWORK.API_URL}/leads/update`;
  private readonly logger = new Logger(FutworkService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventService: EventService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private async buildFutworkPayload(
    lead: FutworkLeadPayload,
    defaultAttempts: number,
  ): Promise<FutworkLeadPayloadForFutwork> {
    const { data, mobile, tele_project_id } = lead;
    this.validateLeadData(data, tele_project_id);

    const resolvedMobile = await this.resolveMobileNumber(data.user_id, mobile);

    return {
      attempts: defaultAttempts,
      data,
      mobile: resolvedMobile,
    };
  }

  private isWithinBusinessHours(): boolean {
    const now = new Date();
    const istTime = getDateIST(now);
    const hours = istTime.getHours();

    // Check if time is between 9 AM (9) and 9 PM (21) inclusive
    return hours >= 9 && hours < 21;
  }

  private async postLeadToFutwork(
    endpoint: string,
    teleProject: string,
    payload: FutworkLeadPayloadForFutwork,
  ): Promise<void> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': this.futworkApiKey,
    };

    const [, error] = await this.errorHandler.try<
      { status: number; data: { message: string } },
      Error
    >(async () => {
      // Futwork API expects an array of leads; wrap single payload
      return await axios.post(endpoint, [payload], {
        headers: requestHeaders,
        params: {
          teleproject: teleProject,
        },
      });
    });

    if (error) {
      throw error;
    }
  }

  private async resolveMobileNumber(
    userId: string,
    providedMobile?: string,
  ): Promise<string> {
    if (providedMobile) {
      const trimmedMobile = providedMobile.trim();
      if (trimmedMobile.length >= 10) {
        return trimmedMobile;
      }
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw Errors.USER.USER_NOT_FOUND();
    }

    const user = await this.userRepository.findOne(
      { _id: new Types.ObjectId(userId) },
      ['primaryMobileNumber'],
    );

    const mobile = user?.primaryMobileNumber;

    if (!mobile) {
      throw Errors.USER.USER_INFO_REQUIRED(
        `Mobile number not found for userId: ${userId}`,
      );
    }

    return mobile;
  }

  private trackLeadSentEvent(
    teleProject: string,
    data: FutworkLeadData,
    mobile: string,
  ): void {
    this.eventService.trackEvent({
      app_client_id: ClientAppIdEnum.ANDROID_MAIN,
      key: Events.LEAD_SENT_TO_FUTWORK,
      os: OS.ANDROID,
      payload: {
        data: {} as Record<string, unknown>, // satisfy event type
        ...data, // satisfy event type
        mobile,
        tele_project: teleProject,
      },
      user_id: data.user_id,
    });
  }

  private validateLeadData(data: FutworkLeadData, teleProject: string): void {
    if (!teleProject || teleProject.trim() === '') {
      throw new BadRequestException('tele_project_id is required.');
    }

    if (!data?.user_id) {
      throw Errors.USER.USER_INFO_REQUIRED('user_id is required.');
    }

    if (!data?.dialect) {
      throw Errors.USER.USER_INFO_REQUIRED('dialect is required.');
    }
  }

  async handleLeadUpdate(
    requestData: ReceiveLeadUpdateFromFutworkRequestDTO,
  ): Promise<void> {
    const {
      attempts,
      callstatus,
      conversationMinutes,
      data,
      mobile,
      outcome,
      recordingUrl,
      responses,
      ...restFields
    } = requestData;

    // Check if user exists before tracking event
    const user = await this.userRepository.findById(data.user_id, ['_id']);
    if (user) {
      // Extract data fields excluding user_id and event_name (already handled)
      const dataFields = Object.fromEntries(
        Object.entries(data).filter(
          ([key]) => key !== 'user_id' && key !== 'event_name',
        ),
      );

      // Extract outcome fields that might have additional properties
      const {
        description: outcomeDescription,
        isFollowup: outcomeIsFollowup,
        isWinning: outcomeIsWinning,
        title: outcomeTitle,
        ...outcomeFields
      } = outcome;

      this.eventService.trackEvent({
        app_client_id: ClientAppIdEnum.ANDROID_MAIN,
        key: Events.LEAD_UPDATED_FROM_FUTWORK,
        os: OS.ANDROID,
        payload: {
          attempts: attempts,
          callstatus: callstatus,
          conversationMinutes: conversationMinutes,
          description: outcomeDescription,
          event_name: data.event_name,
          isFollowup: outcomeIsFollowup,
          isWinning: outcomeIsWinning,
          mobile,
          recordingUrl: recordingUrl,
          responses: (responses && responses.length > 0
            ? responses.map((r) => ({
                answer: r.answer,
                question: r.question,
              }))
            : [{ answer: '', question: '' }]) as [
            { question: string; answer: string },
          ],
          title: outcomeTitle,
          // Include all additional top-level fields from requestData
          ...restFields,
          // Include all additional fields from data object
          ...dataFields,
          // Include any additional fields from outcome object
          ...outcomeFields,
        },
        user_id: data.user_id,
      });
    } else {
      throw Errors.USER.USER_NOT_FOUND();
    }
  }

  async sendLeadToFutwork(
    requestData: SendLeadtoFutworkRequestDTO,
  ): Promise<{ message: string }> {
    const eventName = requestData.data.event_name;

    // If event_name is 'trial_payment_initiated', check business hours
    if (eventName === 'trial_payment_initiated') {
      if (!this.isWithinBusinessHours()) {
        this.logger.error(
          'Lead not sent to Futwork because it is not within business hours',
        );
        return {
          message:
            'Lead not sent to Futwork because it is not within business hours',
        };
      }
    }

    // For all other cases (other event names or missing event_name), send the lead
    const payload = await this.buildFutworkPayload(requestData, 3);

    await this.postLeadToFutwork(
      this.futworkLeadPushEndpoint,
      requestData.tele_project_id,
      payload,
    );

    this.trackLeadSentEvent(
      requestData.tele_project_id,
      payload.data,
      payload.mobile,
    );

    return { message: 'Lead sent to Futwork successfully' };
  }

  async sendLeadUpdateToFutwork(
    requestData: UpdateLeadOnFutworkRequestDTO,
  ): Promise<void> {
    const payload = await this.buildFutworkPayload(requestData, 0);

    await this.postLeadToFutwork(
      this.futworkLeadUpdateEndpoint,
      requestData.tele_project_id,
      payload,
    );
  }
}

interface FutworkLeadPayloadForFutwork {
  attempts: number;
  data: FutworkLeadData;
  mobile: string;
}
