import { Injectable, Logger } from '@nestjs/common';

import { randomUUID } from 'crypto';

import {
  cultureDuplicationEvents,
  eventsMapping,
  rudderEventForwarding,
} from './config/event.config';
import { RudderStackPayload } from './interfaces/event-platforms.interface';
import {
  CultureSpecificEvents,
  EventPlatform,
  Events,
  EventType,
  InjectedProperties,
  ConsumptionEvent,
} from './interfaces/events.interface';
import { AmplitudeEventService } from './services/amplitude.service';
import { AppsFlyerEventService } from './services/appsflyer.service';
import { CleverTapEventService } from './services/clever-tap.service';
import { FirebaseEventService } from './services/firebase.service';
import { RudderStackEventService } from './services/rudderstack.service';
import { StringConstants } from '@app/common/constants/string.constant';
import { User } from '@app/common/entities/user.entity';
import { UserRepository } from '@app/common/repositories/user.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';

type UserEventProperties = Pick<
  User,
  | '_id'
  | 'advertising_id'
  | 'appsflyer_id'
  | 'appVersion'
  | 'bundleIdentifier'
  | 'currentClientIP'
  | 'email'
  | 'initialUserCulture'
  | 'userCulture'
  | 'primaryLanguage'
  | 'oaid'
  | 'primaryMobileNumber'
  | 'firebaseAppInstanceId'
  | 'firebaseClientId'
>;

@Injectable()
export class EventService {
  private logger = new Logger(EventService.name);

  constructor(
    private readonly amplitudeGateway: AmplitudeEventService,
    private readonly firebaseEventService: FirebaseEventService,
    private readonly appsFlyerEventService: AppsFlyerEventService,
    private readonly cleverTapEventService: CleverTapEventService,
    private readonly rudderStackEventService: RudderStackEventService,
    private readonly userRepository: UserRepository,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private isConsumptionEvent(event: EventType): event is ConsumptionEvent {
    return [
      Events.WATCH_TIME_12,
      Events.WATCH_TIME_20,
      Events.WATCH_TIME_30,
      Events.WATCH_TIME_4,
      Events.WATCH_TIME_60,
      Events.WATCH_TIME_8,
    ].includes(event.key as Events);
  }

  async eventHandler(
    event: EventType,
    platform: EventPlatform,
    user: UserEventProperties,
  ) {
    if (this.isConsumptionEvent(event)) {
      this.logger.error({ event }, 'Consumption event received');
    }

    const { initialUserCulture } = user;

    const events: (Events | CultureSpecificEvents)[] = [event.key];
    const culturalEventPlatforms = cultureDuplicationEvents.get(event.key);
    const eventDuplication =
      culturalEventPlatforms != undefined &&
      culturalEventPlatforms.includes(platform);

    if (eventDuplication) {
      const cultureSpecificEvent = (event.key +
        `_${initialUserCulture}`) as CultureSpecificEvents;
      const event_id = randomUUID();
      event.payload.event_id = event_id; // event id will be different for duplicated events

      events.push(cultureSpecificEvent);
    }

    for (const currentEvent of events) {
      this.handlePlatformSpecificEvent(currentEvent, event, user, platform);
    }
  }

  handleAmplitudePlatformEvent(
    currentEvent: Events | CultureSpecificEvents,
    event: EventType,
    user: UserEventProperties,
  ) {
    const {
      _id,
      appVersion,
      currentClientIP,
      email,
      initialUserCulture,
      primaryMobileNumber,
    } = user;
    return this.amplitudeGateway.trackEvent(currentEvent, {
      eventProperties: { ...event.payload },
      userId: event.user_id,
      userProperties: {
        _id,
        appVersion,
        currentClientIP,
        email,
        initialUserCulture,
        primaryMobileNumber,
      },
    });
  }

  handleAppsflyerPlatformEvent(
    currentEvent: Events | CultureSpecificEvents,
    event: EventType,
    user: UserEventProperties,
  ) {
    const {
      _id: customer_user_id,
      advertising_id,
      appsflyer_id,
      appVersion: app_version_name,
      bundleIdentifier,
      currentClientIP: ip,
      firebaseAppInstanceId,
      oaid,
    } = user;

    const appsflyerDataUnAvailable =
      !advertising_id || !bundleIdentifier || !appsflyer_id;

    if (appsflyerDataUnAvailable) {
      this.logger.error(
        { appsflyerDataUnAvailable, event, user },
        'unable to find appsflyer data while sending event',
      );
      return;
    }

    return this.appsFlyerEventService.trackEvent(
      {
        advertising_id,
        app_instance_id: firebaseAppInstanceId,
        app_version_name,
        appsflyer_id,
        bundleIdentifier,
        customer_user_id: customer_user_id.toString(),
        eventName: currentEvent,
        eventValue: { ...event.payload },
        ip,
        oaid,
      },
      event.app_client_id,
    );
  }

  handleClevertapPlatformEvent(
    currentEvent: Events | CultureSpecificEvents,
    event: EventType,
  ) {
    return this.cleverTapEventService.trackEvent(currentEvent, event);
  }

  handleFirebasePlatformEvent(
    currentEvent: Events | CultureSpecificEvents,
    event: EventType,
    user: UserEventProperties,
  ) {
    const { firebaseAppInstanceId, firebaseClientId } = user;

    if (!firebaseAppInstanceId && !firebaseClientId) {
      this.logger.warn(
        'unable to find firebase id while sending firebase event',
      );
      return;
    }

    const injectedProperties: InjectedProperties = {
      initial_user_culture:
        user.initialUserCulture ?? StringConstants.notAvailableText,
      user_content_culture:
        user.primaryLanguage ?? StringConstants.notAvailableText,
      user_culture: user.userCulture ?? StringConstants.notAvailableText,
    };

    return this.firebaseEventService.trackEvent(currentEvent, {
      appId: event.app_client_id,
      firebaseAppInstanceId,
      firebaseClientId,
      properties: { ...event.payload, ...injectedProperties },
      userId: event.user_id,
    });
  }

  handlePlatformSpecificEvent(
    currentEvent: Events | CultureSpecificEvents,
    event: EventType,
    user: UserEventProperties,
    platform: EventPlatform,
  ) {
    switch (platform) {
      case EventPlatform.AMPLITUDE: {
        return this.handleAmplitudePlatformEvent(currentEvent, event, user);
      }
      case EventPlatform.APPSFLYER: {
        return this.handleAppsflyerPlatformEvent(currentEvent, event, user);
      }
      case EventPlatform.CLEVERTAP: {
        return this.handleClevertapPlatformEvent(currentEvent, event);
      }
      case EventPlatform.FIREBASE: {
        return this.handleFirebasePlatformEvent(currentEvent, event, user);
      }
      case EventPlatform.RUDDERSTACK: {
        return this.handleRudderStackEvent(currentEvent, event, user);
      }
    }
  }

  async handleRudderStackEvent(
    currentEvent: Events | CultureSpecificEvents,
    event: EventType,
    user: UserEventProperties,
  ) {
    const { os, payload, user_id } = event;
    const {
      advertising_id,
      email,
      firebaseAppInstanceId,
      primaryMobileNumber,
    } = user;
    const injectedProperties: InjectedProperties = {
      advertising_id,
      app_instance_id: firebaseAppInstanceId,
      initial_user_culture:
        user.initialUserCulture ?? StringConstants.notAvailableText,
      user_content_culture:
        user.primaryLanguage ?? StringConstants.notAvailableText,
      user_culture: user.userCulture ?? StringConstants.notAvailableText,
    };

    const rudderPayload: RudderStackPayload = {
      email,
      event: currentEvent,
      os,
      osVersion: '11', // TODO: confirm the usage of this OS version and get it from the app
      phone: primaryMobileNumber,
      properties: { ...payload, ...injectedProperties },
      userId: user_id,
    };
    return this.rudderStackEventService.trackEvent(rudderPayload);
  }

  async trackEvent(
    event: EventType,
    replaceEventId = false,
    skipAppsflyerEvent = false,
  ) {
    let platforms: EventPlatform[] = eventsMapping[event.key];
    if (skipAppsflyerEvent) {
      platforms = platforms.filter(
        (platform) => platform !== EventPlatform.APPSFLYER,
      );
    }
    const event_id = replaceEventId ? event.payload.event_id : randomUUID();

    event.payload.platforms = rudderEventForwarding[event.key];
    event.payload.event_id = event_id;
    event.payload.timestamp = new Date();

    const user = await this.errorHandler.raiseErrorIfNullAsync(
      this.userRepository.findById(
        event.user_id,
        [
          '_id',
          'primaryMobileNumber',
          'email',
          'initialUserCulture',
          'userCulture',
          'primaryLanguage',
          'advertising_id',
          'appsflyer_id',
          'appVersion',
          'bundleIdentifier',
          'oaid',
          'currentClientIP',
          'firebaseAppInstanceId',
          'firebaseClientId',
        ],
        {
          lean: true,
        },
      ),
      Errors.USER.USER_NOT_FOUND(),
    );

    for (const platform of platforms) {
      await this.eventHandler(event, platform, user);
    }
  }
}
