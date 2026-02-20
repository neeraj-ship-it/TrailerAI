import { Dialect } from '@app/common/enums/app.enum';

type Primitive =
  | string
  | number
  | boolean
  | null
  | Primitive[]
  | { [key: string]: Primitive };

export type FutworkLeadData = {
  dialect: Dialect;
  user_id: string;
  event_name?: string;
} & Record<string, Primitive | undefined>;

export interface FutworkLeadPayload {
  attempts?: number;
  data: FutworkLeadData;
  mobile?: string;
  tele_project_id: string;
}

export type SendLeadtoFutworkRequestDTO = FutworkLeadPayload;

export type UpdateLeadOnFutworkRequestDTO = FutworkLeadPayload;

export interface ReceiveLeadUpdateFromFutworkRequestDTO {
  [key: string]: unknown;
  attempts?: number;
  caller?: string;
  callSid?: string;
  callstatus?: string;

  conversationMinutes?: number;

  data: {
    user_id: string;
    dialect?: string;
    subscription_status?: string;
    fab_need_help?: string;
    event_name: string;
    [key: string]: string | number | undefined;
  };
  disconnectedBy?: string;
  endTime?: string;
  isTerminal?: boolean;
  leadId?: string;

  mobile: string;

  outcome: {
    title: string;
    description: string;
    isWinning: boolean;
    createdAt?: string;
    isFollowup?: boolean;
  };
  phoneNumberSid?: string;

  recordingUrl?: string;

  responses?: {
    question: string;
    answer?: string;
    options?: string;
  }[];
  startDate?: string;
  startTime?: string;
  teleproject?: string;
  urid?: string;
}
