import { EventPlatform, Events } from '../interfaces/events.interface';

// This is the mapping for adding duplicate, user culture specific events
// Just add the event to the map, and add all the platforms to which that needs to be sent.
export const cultureDuplicationEvents: Map<Events, EventPlatform[]> = new Map<
  Events,
  EventPlatform[]
>([
  [Events.TRIAL_ACTIVATED, [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE]], // event -> platform/s for which needs to inject cultural specific event
  [Events.MANDATE_PAUSED, [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE]],
  [Events.MANDATE_RESUMED, [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE]],
  [Events.MANDATE_REVOKED, [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE]],
  [
    Events.PAYMENT_SUCCESSFUL,
    [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  ],
  [Events.STATSIG_EXPERIMENT_EVALUATED, []],
  [
    Events.SUBSCRIPTION_ACTIVATED,
    [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  ],
  [
    Events.SUBSCRIPTION_EXPIRED,
    [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  ],
  [
    Events.SUBSCRIPTION_PAUSED,
    [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  ],
  [
    Events.SUBSCRIPTION_RENEWED,
    [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  ],
  [
    Events.SUBSCRIPTION_RESUMED,
    [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  ],
]);

// Event - platform mapping, to know which event will be sent to what all platforms.
export const eventsMapping: Record<Events, EventPlatform[]> = {
  [Events.APP_UNINSTALL]: [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  [Events.CONTENT_DISLIKED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.CONTENT_LIKED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.CONTENT_SUPERLIKED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.D1_RETENTION_EVENT]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.APPSFLYER,
  ],
  [Events.D2_RETENTION_EVENT]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.APPSFLYER,
  ],
  [Events.D7_RETENTION_EVENT]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.APPSFLYER,
  ],
  [Events.LEAD_SENT_TO_FUTWORK]: [EventPlatform.RUDDERSTACK],
  [Events.LEAD_UPDATED_FROM_FUTWORK]: [EventPlatform.RUDDERSTACK],
  [Events.MANDATE_PAUSED]: [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  [Events.MANDATE_RESUMED]: [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  [Events.MANDATE_REVOKED]: [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  [Events.NCANTO_PANEL_FETCHED]: [EventPlatform.RUDDERSTACK],
  [Events.PAYMENT_SUCCESSFUL]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.FIREBASE,
  ],
  [Events.STATSIG_EXPERIMENT_EVALUATED]: [EventPlatform.RUDDERSTACK],
  [Events.SUBSCRIPTION_ACTIVATED]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.FIREBASE,
  ],
  [Events.SUBSCRIPTION_EXPIRED]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.FIREBASE,
  ],
  [Events.SUBSCRIPTION_EXTENDED]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.CLEVERTAP,
  ],
  [Events.SUBSCRIPTION_PAUSED]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.FIREBASE,
  ],
  [Events.SUBSCRIPTION_RENEWED]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.FIREBASE,
  ],
  [Events.SUBSCRIPTION_RESUMED]: [
    EventPlatform.RUDDERSTACK,
    EventPlatform.FIREBASE,
  ],
  [Events.TRIAL_ACTIVATED]: [EventPlatform.RUDDERSTACK, EventPlatform.FIREBASE],
  [Events.TRIAL_EXTENDED]: [EventPlatform.RUDDERSTACK, EventPlatform.CLEVERTAP],
  [Events.WATCH_REEL]: [EventPlatform.RUDDERSTACK],
  [Events.WATCH_TIME_12]: [EventPlatform.APPSFLYER, EventPlatform.RUDDERSTACK],
  [Events.WATCH_TIME_20]: [EventPlatform.APPSFLYER, EventPlatform.RUDDERSTACK],
  [Events.WATCH_TIME_30]: [EventPlatform.APPSFLYER, EventPlatform.RUDDERSTACK],
  [Events.WATCH_TIME_4]: [EventPlatform.APPSFLYER, EventPlatform.RUDDERSTACK],
  [Events.WATCH_TIME_60]: [EventPlatform.APPSFLYER, EventPlatform.RUDDERSTACK],
  [Events.WATCH_TIME_8]: [EventPlatform.APPSFLYER, EventPlatform.RUDDERSTACK],
};

export const rudderEventForwarding: Record<Events, EventPlatform[]> = {
  [Events.APP_UNINSTALL]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.APPSFLYER,
    EventPlatform.CLEVERTAP,
    EventPlatform.META,
    EventPlatform.FIREBASE,
  ],

  [Events.CONTENT_DISLIKED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.CONTENT_LIKED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.CONTENT_SUPERLIKED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.D1_RETENTION_EVENT]: [],
  [Events.D2_RETENTION_EVENT]: [],
  [Events.D7_RETENTION_EVENT]: [],
  [Events.LEAD_SENT_TO_FUTWORK]: [EventPlatform.RUDDERSTACK],
  [Events.LEAD_UPDATED_FROM_FUTWORK]: [EventPlatform.RUDDERSTACK],
  [Events.MANDATE_PAUSED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.MANDATE_RESUMED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.MANDATE_REVOKED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.NCANTO_PANEL_FETCHED]: [],
  [Events.PAYMENT_SUCCESSFUL]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.STATSIG_EXPERIMENT_EVALUATED]: [],
  [Events.SUBSCRIPTION_ACTIVATED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.SUBSCRIPTION_EXPIRED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.SUBSCRIPTION_EXTENDED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.SUBSCRIPTION_PAUSED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.SUBSCRIPTION_RENEWED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.SUBSCRIPTION_RESUMED]: [
    EventPlatform.AMPLITUDE,
    EventPlatform.CLEVERTAP,
  ],
  [Events.TRIAL_ACTIVATED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.TRIAL_EXTENDED]: [EventPlatform.AMPLITUDE, EventPlatform.CLEVERTAP],
  [Events.WATCH_REEL]: [EventPlatform.AMPLITUDE],
  [Events.WATCH_TIME_12]: [],
  [Events.WATCH_TIME_20]: [],
  [Events.WATCH_TIME_30]: [],
  [Events.WATCH_TIME_4]: [],
  [Events.WATCH_TIME_60]: [],
  [Events.WATCH_TIME_8]: [],
};
