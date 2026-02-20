import { CurrencySymbolEnum, Lang } from '@app/common/enums/app.enum';

export interface IAllInvoiceRequest {
  lang: Lang;
  page?: number;
  perPage?: number;
  userId: string;
}

export interface InvoiceResponse {
  currencySymbol: CurrencySymbolEnum;
  payingPrice: number;
  planName: string;
  subscriptionDate: Date;
  subscriptionId: string;
  subscriptionValid: Date;
}
