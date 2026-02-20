export enum CeletelNotificationCategory {
  SUBSCRIPTION_SUCCESS = 'subscription_success',
  TRIAL_CONVERSION_INTIMATION = 'trial_conversion_intimation',
  TRIAL_FAIL = 'trial_fail',
  TRIAL_FAIL_APP = 'trial_fail_app',
  TRIAL_SUCCESS = 'trial_success',
}

export enum CeletelTemplateType {
  MEDIA_TEMPLATE = 'MEDIA_TEMPLATE',
}
export enum CeletelMediaType {
  IMAGE = 'image',
  URL = 'url',
  VIDEO = 'video',
}

export interface CeletelTemplate {
  templateContent: TemplateContent;
  templateId: string;
  templateType: CeletelTemplateType;
}

interface TemplateContent {
  mediaTemplate: {
    templateId: string;
    bodyParameterValues: Record<number, unknown>;
    buttons?: Button;
    media: { type: CeletelMediaType; url: string };
  };
  preview_url: boolean;
  shorten_url: boolean;
  type: CeletelTemplateType;
}

interface Button {
  actions: ButtonPayload[];
}

interface ButtonPayload {
  index: string;
  payload: string;
  type: CeletelMediaType;
}

export interface TrialSuccessTemplateValues {
  postTrialMonths: number;
  postTrialPrice: number;
  trialDays: number;
}

export interface TrialFailTemplateValues {
  postTrialPrice: number;
}
export interface TrialConversionTemplateValues {
  postTrialMonths: number;
  postTrialPrice: number;
  trialDays: number;
}
