import {
  SetuMandateAmountRule,
  SetuMandateCreationMode,
  SetuMandateInitiationMode,
  SetuMandateRecurrenceFrequency,
  SetuMandateRecurrenceFrequencyRule,
} from '../enums.setu';
import { CurrencyEnum } from '@app/common/enums/app.enum';

export interface SetuCreateMandateDto {
  allowMultipleDebit: false; // Allow multiple debits for the mandate
  amount: number; // Amount(in paise) of the mandate
  amountRule: SetuMandateAmountRule;
  autoExecute: false; // Auto execution is disabled , as we need to execute the mandate manually
  autoPreNotify: false;
  blockFunds: false;
  creationMode: SetuMandateCreationMode;
  currency: CurrencyEnum;
  customerRevocable: boolean;
  endDate: string;
  expireAfter: number;
  firstExecutionAmount: number;
  frequency: SetuMandateRecurrenceFrequency;
  initiationMode: SetuMandateInitiationMode;
  merchantVpa: string;
  purpose: '14';
  recurrenceRule: SetuMandateRecurrenceFrequencyRule;
  recurrenceValue: number;
  referenceId: string;
  showFirstExecutionAmountToPayer: true; // keeping it default as true due to business requirement
  startDate: string;
  transactionNote: string;
}

export interface SetuSendPreDebitNotificationDto {
  amount: number;
  executionDate: string;
  referenceId: string;
  sequenceNumber: number;
  umn: string;
}

export interface SetuExecuteMandateDto {
  amount: number;
  referenceId: string;
  remark: string;
  sequenceNumber: number;
  umn: string;
}
