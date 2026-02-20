import { Injectable, Inject, Logger } from '@nestjs/common';

import { Types } from 'mongoose';

import {
  AddUserEventRequest,
  AddUserEventResponse,
  GetUserEventsResponse,
} from '../dtos/userEvent.dto';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { UserEventData } from '@app/common/entities/user.event';
import { UserEventRepository } from '@app/common/repositories/userEvent.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { EventService } from '@app/events/events.service';
import {
  ConsumptionEvent,
  Events,
  RetentionEvent,
} from '@app/events/interfaces/events.interface';
import { ClientAppIdEnum, OS, Platform } from 'common/enums/app.enum';
import { MasterMandateStatusEnum } from 'common/enums/common.enums';
import { MasterMandateRepository } from 'common/repositories/masterMandate.repository';
import { UserRepository } from 'common/repositories/user.repository';
import { UserEventSelfHostedRepository } from 'common/repositories/userEventSelfHosted.repository';
@Injectable()
export class UserEventService {
  private readonly logger = new Logger(UserEventService.name);
  private readonly MIN_ANDROID_BUILD_FOR_EVENT = 505830;
  private readonly MIN_IOS_BUILD_FOR_EVENT = 506561;

  constructor(
    @Inject()
    private userEventRepository: UserEventRepository,
    @Inject() private errorHandler: ErrorHandlerService,
    @Inject() private eventService: EventService,
    @Inject() private userRepository: UserRepository,
    @Inject() private masterMandateRepository: MasterMandateRepository,
    @Inject()
    private userEventSelfHostedRepository?: UserEventSelfHostedRepository,
  ) {}

  private getReadRepository():
    | UserEventRepository
    | UserEventSelfHostedRepository {
    if (
      APP_CONFIGS.MONGO_DB.USER_EVENTS.READ_FROM_SECONDARY &&
      this.userEventSelfHostedRepository
    ) {
      return this.userEventSelfHostedRepository;
    }
    return this.userEventRepository;
  }

  private async updateEventData(
    userId: string,
    eventData: UserEventData,
  ): Promise<void> {
    if (APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE) {
      try {
        await this.userEventRepository.updateOne({
          filter: {
            _id: userId,
            events: { $elemMatch: { eventName: eventData.eventName } },
          },
          update: { $set: { 'events.$': eventData } },
        });
      } catch (error) {
        this.logger.error(
          { error, eventData, userId },
          'user event update failed for main database',
        );
      }
    }
    if (
      APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE &&
      this.userEventSelfHostedRepository
    ) {
      try {
        await this.userEventSelfHostedRepository.updateOne({
          filter: {
            _id: userId,
            events: { $elemMatch: { eventName: eventData.eventName } },
          },
          update: { $set: { 'events.$': eventData } },
        });
      } catch (error) {
        this.logger.error(
          { error, eventData, userId },
          'user event update failed for self hosted database',
        );
      }
    }
  }

  private async writeToDB(
    userId: string,
    eventData: UserEventData,
  ): Promise<boolean> {
    const results: boolean[] = [];
    let primaryWriteResult: boolean | null = null;
    if (APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE) {
      primaryWriteResult = await this.userEventRepository.addUserEvent(
        userId,
        eventData,
      );
      results.push(primaryWriteResult);
    }
    if (
      APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_SELF_HOSTED_WRITE &&
      this.userEventSelfHostedRepository
    ) {
      if (primaryWriteResult === true) {
        const userEvent = await this.userEventRepository.getUserEvents(userId);
        if (userEvent) {
          results.push(
            await this.userEventSelfHostedRepository.addFullUserEvent(
              userEvent,
            ),
          );
        }
      } else {
        results.push(
          await this.userEventSelfHostedRepository.addUserEvent(
            userId,
            eventData,
          ),
        );
      }
    }
    return results.some((result) => result === true);
  }

  async addUserEvent(
    userId: string,
    os: OS,
    dialect: string,
    request: AddUserEventRequest,
  ): Promise<AddUserEventResponse> {
    const { eventName, metadata } = request;

    if (eventName.trim().length === 0) {
      throw new Error('EventName cannot be empty');
    }

    const eventData: UserEventData = {
      createdAt: new Date(),
      dialect: dialect,
      eventName: eventName.trim(),
      metadata: metadata,
      os: os.toString(),
      sentToAppsflyer: false,
    };

    const isEventAdded = await this.writeToDB(userId, eventData);

    if (!isEventAdded) {
      this.logger.error(
        { eventData, userId },
        'User event write failed on all targets',
      );

      // Throw if primary is off and secondary is the only source of truth
      // if (!APP_CONFIGS.MONGO_DB.USER_EVENTS.ENABLE_PRIMARY_WRITE) {
      //   throw new Error('Failed to write event to the secondary database');
      // }
    }

    if (isEventAdded) {
      const user = await this.errorHandler.raiseErrorIfNullAsync(
        this.userRepository.findById(
          userId,
          ['_id', 'signUpOs', 'signUpPlatform', 'signUpBuildNumber'],
          {
            lean: true,
          },
        ),
        Errors.USER.USER_NOT_FOUND(),
      );
      if (
        (user.signUpPlatform === Platform.APP &&
          user.signUpOs === OS.ANDROID &&
          user.signUpBuildNumber &&
          Number(user.signUpBuildNumber) < this.MIN_ANDROID_BUILD_FOR_EVENT) ||
        (user.signUpPlatform === Platform.APP &&
          user.signUpOs === OS.IOS &&
          user.signUpBuildNumber &&
          Number(user.signUpBuildNumber) < this.MIN_IOS_BUILD_FOR_EVENT)
      ) {
        return {
          message: 'Event added successfully',
        };
      }
      const mandateData = await this.masterMandateRepository.findOne(
        {
          status: MasterMandateStatusEnum.MANDATE_ACTIVE,
          user: new Types.ObjectId(userId),
        },
        ['platform'],
      );
      let skipAppsflyerEvent = false;
      if (
        mandateData &&
        Object.values(Platform).includes(mandateData.platform as Platform) &&
        mandateData.platform === Platform.WEB
      ) {
        skipAppsflyerEvent = !skipAppsflyerEvent;
      }
      await this.sendEventToDestination(
        eventData,
        userId,
        os,
        mandateData?.platform as Platform,
        skipAppsflyerEvent,
      );

      // update the event data to set sentToAppsflyer to true
      eventData.sentToAppsflyer = true;
      await this.updateEventData(userId, eventData);
    }

    return {
      message: 'Event added successfully',
    };
  }

  async getUserEventByEventName(
    userId: string,
    eventName: string,
  ): Promise<GetUserEventsResponse> {
    if (eventName.trim().length === 0) {
      throw new Error('eventName are required');
    }

    const repository = this.getReadRepository();
    const userEvent = await this.errorHandler.raiseErrorIfNullAsync(
      repository.getUserEventByEventName(userId, eventName),
      Errors.USER.USER_EVENT_NOT_FOUND(),
    );

    return {
      events: [userEvent],
      totalCount: 1,
    };
  }

  async getUserEvents(userId: string): Promise<GetUserEventsResponse> {
    const repository = this.getReadRepository();
    const userEvent = await this.errorHandler.raiseErrorIfNullAsync(
      repository.getUserEvents(userId),
      Errors.USER.USER_EVENT_NOT_FOUND(),
    );

    return {
      events: userEvent.events,
      totalCount: userEvent.events.length,
    };
  }

  async sendEventToDestination(
    userEvent: UserEventData,
    user: string,
    os: OS,
    mandatePlatform: Platform,
    skipAppsflyerEvent: boolean,
  ) {
    let event: ConsumptionEvent | RetentionEvent | null = null;

    switch (userEvent.eventName) {
      case Events.WATCH_TIME_4:
      case Events.WATCH_TIME_8:
      case Events.WATCH_TIME_12:
      case Events.WATCH_TIME_20:
      case Events.WATCH_TIME_30:
      case Events.WATCH_TIME_60:
        event = {
          app_client_id: ClientAppIdEnum.ANDROID_MAIN,
          key: userEvent.eventName,
          os,
          payload: {
            deeplink: userEvent.metadata?.deeplink as string,
            event_id: `${user}_${userEvent.eventName}`,
            mandatePlatform: mandatePlatform || Platform.APP,
            source: 'BACKEND',
            utm_campaign: userEvent.metadata?.utm_campaign as string,
            utm_medium: userEvent.metadata?.utm_medium as string,
            utm_source: userEvent.metadata?.utm_source as string,
          },
          user_id: user,
        };
        break;
      case Events.D1_RETENTION_EVENT:
      case Events.D2_RETENTION_EVENT:
      case Events.D7_RETENTION_EVENT:
        event = {
          app_client_id: ClientAppIdEnum.ANDROID_MAIN,
          key: userEvent.eventName,
          os,
          payload: {
            deeplink: userEvent.metadata?.deeplink as string,
            event_id: `${user}_${userEvent.eventName}`,
            mandatePlatform: mandatePlatform || Platform.APP,
            source: 'BACKEND',
            utm_campaign: userEvent.metadata?.utm_campaign as string,
            utm_medium: userEvent.metadata?.utm_medium as string,
            utm_source: userEvent.metadata?.utm_source as string,
          },
          user_id: user,
        };
        break;
      default:
        throw new Error('unidentified event name');
    }
    if (event) {
      this.logger.error({ event }, 'Sending consumption event to destination');
      await this.eventService.trackEvent(event, true, skipAppsflyerEvent);
    } else {
      this.logger.error({ userEvent }, 'Sending event to destination');
    }
  }
}
