import {
  ClientAppIdEnum,
  Dialect,
  OS,
  Platform,
} from '@app/common/enums/app.enum';
import {
  ContentType,
  MasterMandateStatusEnum,
} from '@app/common/enums/common.enums';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';

export enum EventPlatform {
  AMPLITUDE = 'AMPLITUDE',
  APPSFLYER = 'APPSFLYER',
  CLEVERTAP = 'CLEVERTAP',
  FIREBASE = 'FIREBASE',
  META = 'META',
  RUDDERSTACK = 'RUDDERSTACK',
}

export enum Events {
  APP_UNINSTALL = 'app_uninstall',
  CONTENT_DISLIKED = 'content_disliked',
  CONTENT_LIKED = 'content_liked',
  CONTENT_SUPERLIKED = 'content_superliked',
  D1_RETENTION_EVENT = 'd1_retained_user',
  D2_RETENTION_EVENT = 'd2_retained_user',
  D7_RETENTION_EVENT = 'd7_retained_user',
  LEAD_SENT_TO_FUTWORK = 'lead_sent_to_futwork',
  LEAD_UPDATED_FROM_FUTWORK = 'lead_updated_from_futwork',
  MANDATE_PAUSED = 'mandate_paused',
  MANDATE_RESUMED = 'mandate_resumed',
  MANDATE_REVOKED = 'mandate_revoked',
  NCANTO_PANEL_FETCHED = 'ncanto_panel_fetched',
  PAYMENT_SUCCESSFUL = 'payment_successful',
  STATSIG_EXPERIMENT_EVALUATED = 'statsig_experiment_evaluated',
  SUBSCRIPTION_ACTIVATED = 'subscription_activated',
  SUBSCRIPTION_EXPIRED = 'subscription_over',
  SUBSCRIPTION_EXTENDED = 'subscription_extended',
  SUBSCRIPTION_PAUSED = 'subscription_paused',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_RESUMED = 'subscription_resumed',
  TRIAL_ACTIVATED = 'trial_activated',
  TRIAL_EXTENDED = 'trial_extended',
  WATCH_REEL = 'watch_reel',
  WATCH_TIME_12 = 'watchtime_12min_achieved',
  WATCH_TIME_20 = 'watchtime_20_min_achieved',
  WATCH_TIME_30 = 'watchtime_30_min_achieved',
  WATCH_TIME_4 = 'watchtime_4min_achieved',
  WATCH_TIME_60 = 'watchtime_60_min_achieved',
  WATCH_TIME_8 = 'watchtime_8min_achieved',
}

export enum ActionSource {
  APP = 'app',
  NEW_MANDATE = 'new_mandate',
  PSP = 'psp',
  SUPPORT = 'support_agent',
}

export interface RetentionEvent extends BaseEvent {
  key:
    | Events.D1_RETENTION_EVENT
    | Events.D2_RETENTION_EVENT
    | Events.D7_RETENTION_EVENT;
  payload: BaseEventPayload & {
    mandatePlatform?: Platform;
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    deeplink?: string;
  };
}

export interface TrialActivatedEvent extends BaseEvent {
  key: Events.TRIAL_ACTIVATED;
  payload: BaseEventPayload & {
    platform: Platform;
    mandate_id: string | null;
    status: MasterMandateStatusEnum;
    sequence_number: number;
    txn_id: string;
    plan_id: string;
    pgName: PaymentGatewayEnum;
    dialect: Dialect;
  };
}

export interface TrialExtendedEvent extends BaseEvent {
  key: Events.TRIAL_EXTENDED;
  payload: BaseEventPayload & {
    no_of_days_extended: number;
    original_expiry_date: Date;
    new_expiry_date: Date;
    subscription_id: string;
    plan_id: string;
  };
}

export interface SubscriptionExtendedEvent extends BaseEvent {
  key: Events.SUBSCRIPTION_EXTENDED;
  payload: BaseEventPayload & {
    no_of_days_extended: number;
    original_expiry_date: Date;
    new_expiry_date: Date;
    subscription_id: string;
    plan_id: string;
    pg_txn_id?: string;
    pg_subscription_id?: string | null;
    txn_amount?: number;
    payment_gateway?: string;
    transaction_id?: string;
    user_details?: {
      primary_mobile_number?: string;
      email?: string;
      platform?: string;
      os?: string;
    };
  };
}

export interface StatsigExperimentEvaluatedEvent extends BaseEvent {
  key: Events.STATSIG_EXPERIMENT_EVALUATED;
  payload: BaseEventPayload & {
    name: string;
    rule_id: string;
    group_name: string | null;
    id_type: string;
    statsig_user_property: string; // strigified property object
    value: string; // strigified value object
  };
}
export interface MandatePausedEvent extends BaseEvent {
  key: Events.MANDATE_PAUSED;
  payload: BaseEventPayload & {
    platform: Platform;
    mandate_id: string;
    plan_id: string;
    action_source: ActionSource;
    pg: PaymentGatewayEnum;
  };
}

export interface MandateResumedEvent extends BaseEvent {
  key: Events.MANDATE_RESUMED;
  payload: BaseEventPayload & {
    platform: Platform;
    mandate_id: string | null;
    plan_id: string;
    action_source: ActionSource;
  };
}
export interface MandateRevokedEvent extends BaseEvent {
  key: Events.MANDATE_REVOKED;
  payload: BaseEventPayload & {
    mandate_id: string | null;
    plan_id: string;
    action_source: ActionSource;
    pg: PaymentGatewayEnum;
  };
}
export interface SubscriptionActivatedEvent extends BaseEvent {
  key: Events.SUBSCRIPTION_ACTIVATED;
  payload: BaseEventPayload & {
    subscription_id: string;
    txn_id: string;
    plan_id: string;
  };
}
export interface SubscriptionExpiredEvent extends BaseEvent {
  key: Events.SUBSCRIPTION_EXPIRED;
  payload: BaseEventPayload & {
    subscription_id: string;
    plan_id: string;
  };
}
export interface SubscriptionPausedEvent extends BaseEvent {
  key: Events.SUBSCRIPTION_PAUSED;
  payload: BaseEventPayload & {
    subscription_id: string;
    plan_id: string;
    action_source: ActionSource;
  };
}
export interface SubscriptionRenewedEvent extends BaseEvent {
  key: Events.SUBSCRIPTION_RENEWED;
  payload: BaseEventPayload & {
    subscription_id: string;
    plan_id: string;
  };
}
export interface ContentLikedEvent extends BaseEvent {
  key: Events.CONTENT_LIKED;
  payload: BaseEventPayload & {
    content_slug: string;
    content_type: ContentType;
    source_widget?: string;
  };
}
export interface ContentDislikedEvent extends BaseEvent {
  key: Events.CONTENT_DISLIKED;
  payload: BaseEventPayload & {
    content_slug: string;
    content_type: ContentType;
    source_widget?: string;
  };
}
export interface ContentSuperlikedEvent extends BaseEvent {
  key: Events.CONTENT_SUPERLIKED;
  payload: BaseEventPayload & {
    content_slug: string;
    content_type: ContentType;
    source_widget?: string;
  };
}
export interface SubscriptionResumedEvent extends BaseEvent {
  key: Events.SUBSCRIPTION_RESUMED;
  payload: BaseEventPayload & {
    subscription_id: string;
    plan_id: string;
    action_source: ActionSource;
  };
}
export interface PaymentSuccessfulEvent extends BaseEvent {
  key: Events.PAYMENT_SUCCESSFUL;
  payload: BaseEventPayload & {
    pg_name: PaymentGatewayEnum;
    txn_id: string;
    plan_id: string;
  };
}
export interface WatchReelEvent extends BaseEvent {
  key: Events.WATCH_REEL;
  payload: BaseEventPayload & {
    reel_id: string;
    watch_timestamp: number;
    count: number;
    total_duration: number;
    watch_duration: number;
  };
}

export interface BaseEvent {
  app_client_id: ClientAppIdEnum | null;
  key: Events;
  os: OS;
  user_id: string;
}
export interface BaseEventPayload {
  event_id?: string; // intentially in snake case as we have to match it with capi event_id variable
  platforms?: EventPlatform[];
  source?: string;
  timestamp?: Date;
}

export interface AppUninstallEvent extends BaseEvent {
  key: Events.APP_UNINSTALL;
  payload: BaseEventPayload & {
    name: 'app_remove';
    params?: Record<string, unknown>;
    reportingDate?: string;
    user: {
      appInfo: {
        appId: ClientAppIdEnum;
        appInstanceId: string;
        appPlatform: string;
        appStore: string;
        appVersion: string;
      };
      bundleInfo?: Record<string, unknown>;
      deviceInfo?: Record<string, unknown>;
      firstOpenTime?: string;
      geoInfo?: Record<string, unknown>;
      userId: string;
      userProperties?: Record<string, unknown>;
    };
  };
}

export interface ConsumptionEvent extends BaseEvent {
  key:
    | Events.WATCH_TIME_4
    | Events.WATCH_TIME_8
    | Events.WATCH_TIME_12
    | Events.WATCH_TIME_20
    | Events.WATCH_TIME_30
    | Events.WATCH_TIME_60;
  payload: BaseEventPayload & {
    mandatePlatform?: Platform;
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    deeplink?: string;
  };
}

export interface InjectedProperties {
  advertising_id?: string;
  app_instance_id?: string;
  initial_user_culture?: string;
  user_content_culture?: string;
  user_culture?: string;
}

export interface LeadSentToFutworkEvent extends BaseEvent {
  key: Events.LEAD_SENT_TO_FUTWORK;
  payload: BaseEventPayload & {
    data: Record<string, unknown>;
    mobile: string;
    tele_project: string;
  };
}

export interface NcantoPanelFetchedEvent extends BaseEvent {
  key: Events.NCANTO_PANEL_FETCHED;
  payload: BaseEventPayload & {
    dialect: Dialect;
    city: string;
    panels: {
      context_name: string;
      slugs: string[];
    }[];
  };
}
export interface LeadUpdatedfromFutworkEvent extends BaseEvent {
  key: Events.LEAD_UPDATED_FROM_FUTWORK;
  payload: BaseEventPayload & {
    mobile: string;
    title: string;
    description: string;
    event_name?: string;
    isWinning: boolean;
    isFollowup?: boolean;
    responses?: [
      {
        question: string;
        answer: string;
      },
    ];
    recordingUrl?: string;
    conversationMinutes?: number;
    callstatus?: string;
    attempts?: number;
    [key: string]: unknown;
  };
}

export type EventType =
  | TrialActivatedEvent
  | TrialExtendedEvent
  | PaymentSuccessfulEvent
  | MandatePausedEvent
  | MandateResumedEvent
  | MandateRevokedEvent
  | NcantoPanelFetchedEvent
  | SubscriptionActivatedEvent
  | SubscriptionExpiredEvent
  | SubscriptionPausedEvent
  | SubscriptionRenewedEvent
  | SubscriptionResumedEvent
  | SubscriptionExtendedEvent
  | AppUninstallEvent
  | ContentLikedEvent
  | ContentDislikedEvent
  | WatchReelEvent
  | StatsigExperimentEvaluatedEvent
  | ContentSuperlikedEvent
  | ConsumptionEvent
  | RetentionEvent
  | LeadSentToFutworkEvent
  | LeadUpdatedfromFutworkEvent;

export type CultureSpecificEvents = `${Events}_${Dialect}`;
