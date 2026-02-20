import { PaymentApp } from './misc.interface';
import { CurrencyEnum } from '@app/common/enums/app.enum';

export interface CreateMandate {
  currency: CurrencyEnum;
  endDate: Date;
  /**
   * Initial price for creating the mandate in rupees
   */
  mandateCreationPrice: number;
  /**
   * Maximum amount limit for the mandate in rupees
   */
  maxAmountLimit: number;
  // userId: string;
  paymentApp: PaymentApp;
  stageMandateOrderId: string;
  startDate: Date;
}

export interface CreatedMandate {
  intentLink: string;
  mandateId: string;
}
