import { APP_CONFIGS } from '@app/common/configs/app.config';
import { Dialect } from '@app/common/enums/app.enum';
import {
  CeletelMediaType,
  CeletelNotificationCategory,
  CeletelTemplate,
  CeletelTemplateType,
  TrialConversionTemplateValues,
  TrialFailTemplateValues,
  TrialSuccessTemplateValues,
} from 'src/notification/interfaces/celetel-whatsapp-template.interface';

const { SUPPORT_NUMBER } = APP_CONFIGS.STAGE;

export const celetelWhatsAppTemplates: Record<
  Dialect,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<CeletelNotificationCategory, (args: any) => CeletelTemplate>
> = {
  [Dialect.BHO]: {
    [CeletelNotificationCategory.SUBSCRIPTION_SUCCESS]: () => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {},
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/BHOJPURI_SUBSCRIPTION_SUCCESS.mp4',
            },
            templateId: 'monthly_payment_subscription_success',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'monthly_payment_subscription_success',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_CONVERSION_INTIMATION]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialConversionTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: postTrialMonths,
              2: postTrialPrice,
              3: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/BHOJPURI_TRIAL_CONVERSION_INTIMATION.mp4',
            },
            templateId: 'trial_1_day_before_money_deduct',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'trial_1_day_before_money_deduct',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/BHO_Payment_Failed_Trial.mp4',
            },
            templateId: 'payment_failed_subscription',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_failed_subscription',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL_APP]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: { 0: postTrialPrice, 1: SUPPORT_NUMBER },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/BHO_Payment_Failed_Trial.mp4',
            },
            templateId: 'payment_failed_subscription',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_failed_subscription',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_SUCCESS]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialSuccessTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: trialDays,
              2: postTrialMonths,
              3: postTrialPrice,
              4: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/BHO_WA_Trial_Sucess_16X9.mp4',
            },
            templateId: 'payment_success_subscription',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_success_subscription',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
  },
  // TODO: Gujarati templates to be replaced here
  [Dialect.GUJ]: {
    [CeletelNotificationCategory.SUBSCRIPTION_SUCCESS]: () => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {},
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ Sub Success_NC.mp4',
            },
            templateId: 'sub_sucess_rjnew',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'sub_sucess_rjnew',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_CONVERSION_INTIMATION]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialConversionTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: postTrialMonths,
              2: postTrialPrice,
              3: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_Money_Deduction_Trial_WA.mp4',
            },
            templateId: 'final_rj_money',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'final_rj_money',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_Payment_Failed_Trial.mp4',
            },
            templateId: 'payment_fail_rj_web',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_fail_rj_web',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL_APP]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_Payment_Failed_Trial.mp4',
            },
            templateId: 'payment_fail_rj_v3',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_fail_rj_v3',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_SUCCESS]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialSuccessTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: trialDays,
              2: postTrialMonths,
              3: postTrialPrice,
              4: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_WA_Trial_Sucess_16X9.mp4',
            },
            templateId: 'rj_tri_v2',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'rj_tri_v2',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
  },
  [Dialect.HAR]: {
    [CeletelNotificationCategory.SUBSCRIPTION_SUCCESS]: () => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {},
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/hr_sub_sucess_wa.mp4',
            },
            templateId: 'sub_hr_new',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'sub_hr_new',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_CONVERSION_INTIMATION]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialConversionTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: postTrialMonths,
              2: postTrialPrice,
              3: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/HR_Trial_Money_Deduction.mp4',
            },
            templateId: 'hr_money',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'hr_money',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/HR_Payment_Failed_Trial.mp4',
            },
            templateId: 'hr_payment_fail_web',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'hr_payment_fail_web',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL_APP]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/HR_Payment_Failed_Trial.mp4',
            },
            templateId: 'hr_payment_fail_v4',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'hr_payment_fail_v4',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_SUCCESS]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialSuccessTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: trialDays,
              2: postTrialMonths,
              3: postTrialPrice,
              4: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/HR_WA_Trial_Sucess_16X9.mp4',
            },
            templateId: 't_hr',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 't_hr',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
  },
  [Dialect.RAJ]: {
    [CeletelNotificationCategory.SUBSCRIPTION_SUCCESS]: () => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {},
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ Sub Success_NC.mp4',
            },
            templateId: 'sub_sucess_rjnew',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'sub_sucess_rjnew',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_CONVERSION_INTIMATION]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialConversionTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: postTrialMonths,
              2: postTrialPrice,
              3: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_Money_Deduction_Trial_WA.mp4',
            },
            templateId: 'final_rj_money',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'final_rj_money',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_Payment_Failed_Trial.mp4',
            },
            templateId: 'payment_fail_rj_web',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_fail_rj_web',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_FAIL_APP]: ({
      postTrialPrice,
    }: TrialFailTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: postTrialPrice,
              1: SUPPORT_NUMBER,
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_Payment_Failed_Trial.mp4',
            },
            templateId: 'payment_fail_rj_v3',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'payment_fail_rj_v3',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
    [CeletelNotificationCategory.TRIAL_SUCCESS]: ({
      postTrialMonths,
      postTrialPrice,
      trialDays,
    }: TrialSuccessTemplateValues) => {
      return {
        templateContent: {
          mediaTemplate: {
            bodyParameterValues: {
              0: trialDays,
              1: trialDays,
              2: postTrialMonths,
              3: postTrialPrice,
              4: SUPPORT_NUMBER,
            },
            buttons: {
              actions: [
                {
                  index: '0',
                  payload: 'https://tnpl-test.onelink.me/rkZ9/u4f39rfd',
                  type: CeletelMediaType.URL,
                },
              ],
            },
            media: {
              type: CeletelMediaType.VIDEO,
              url: 'https://media.stage.in/whatsAppVideo/RJ_WA_Trial_Sucess_16X9.mp4',
            },
            templateId: 'rj_tri_v2',
          },
          preview_url: false,
          shorten_url: true,
          type: CeletelTemplateType.MEDIA_TEMPLATE,
        },
        templateId: 'rj_tri_v2',
        templateType: CeletelTemplateType.MEDIA_TEMPLATE,
      };
    },
  },
};
