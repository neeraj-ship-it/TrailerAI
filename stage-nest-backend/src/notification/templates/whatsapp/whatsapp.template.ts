import { WhatsappNotificationKeys } from '../../../notification/interfaces/notificationKeys.interface';
import { SendTrialActivatedNotification } from '../../../notification/interfaces/whatsappPayload.interface';

export const WhatsappTemplates: Record<
  WhatsappNotificationKeys,
  (payload: SendTrialActivatedNotification) => {
    content: string;
    mediaURL?: string;
  }
> = {
  [WhatsappNotificationKeys.SEND_TRIAL_ACTIVATED_NOTIFICATION_HARYANA]: ({
    trialDays,
  }: SendTrialActivatedNotification) => ({
    content: String.raw`*राम+राम+जी*+🙏🏽\n\nSTAGE+की+हरियाणवी+बोली+को+बढाने+की+इस+क्रांति+मैं+आपका+स्वागत+है+🤩🎉\n*${trialDays}+दिन*+का+आपका+*FREE+ट्रायल*+शुरू+हो+ग्या+है।\nईबे+फटाफट+देखो+धमाकेदार+🔥+फिल्म++🎬+सीरीज+🎥+और+भी+बहुत+कुछ+*सिर्फ+STAGE+ऐप+पै।*\n\n*आपणी+बोली।+आपणी+शान।+आपणी+पहचान।*\n*जय+हरियाणा+🌾+जय+हरियाणवी+❤️*`,
    mediaURL:
      'https://media.stage.in/subscription/HAR_TNPL_Payment_Success_29_08_23.jpg',
  }),
};
