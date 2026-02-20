import { CultureSpecificEvents, Events } from './events.interface';
import { ClientAppIdEnum, OS } from '@app/common/enums/app.enum';

export interface FirebaseEventPayload {
  appId: ClientAppIdEnum | null;
  firebaseAppInstanceId?: string; // for apps
  firebaseClientId?: string; // for web
  properties: Record<string, unknown>;
  userId: string;
}
export interface AmplitudeEventPayload {
  // appId: ClientAppIdEnum;
  eventProperties: Record<string, unknown>;
  userId: string;
  userProperties: Record<string, unknown>;
}

export interface RudderStackPayload {
  email?: string;
  event: Events | CultureSpecificEvents;
  os: OS;
  osVersion: string;
  phone?: string;
  properties: Record<string, unknown>;
  userId: string;
}
