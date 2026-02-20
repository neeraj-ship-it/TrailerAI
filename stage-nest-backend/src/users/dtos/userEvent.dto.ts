import { UserEventData } from '@app/common/entities/user.event';

export interface AddUserEventRequest {
  eventName: string;
  metadata?: Record<string, unknown>;
}

export interface AddUserEventResponse {
  message: string;
}

export interface GetUserEventsResponse {
  events: UserEventData[];
  totalCount: number;
}
