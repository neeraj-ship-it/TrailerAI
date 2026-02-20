import { Types, Document } from 'mongoose';

import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { CurrencyEnum, CurrencySymbolEnum } from '@app/common/enums/app.enum';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';

export const generateUserSubscriptionHistory = (
  count: number,
): Omit<UserSubscriptionHistory, keyof Document>[] => {
  const seedData: Omit<UserSubscriptionHistory, keyof Document>[] = [];

  for (let i = 0; i < count; i++) {
    const doc: Omit<UserSubscriptionHistory, keyof Document> = {
      ...userSubscriptionHistoryDoc,
      // _id: new Types.ObjectId(),
      subscriptionId: `test_subscriptionId_${i}`,
    };

    seedData.push(doc);
  }

  return seedData;
};

export const generateUserSubscriptionHistoryPaytm = (
  subscriptionId: string,
): Omit<UserSubscriptionHistory, keyof Document> => {
  const seedData: Omit<UserSubscriptionHistory, keyof Document> = {
    ...userSubscriptionHistoryDoc,
    // _id: new Types.ObjectId(),
    subscriptionId: `PAYTM_${subscriptionId}`,
  };

  return seedData;
};

const userSubscriptionHistoryDoc: Omit<
  UserSubscriptionHistory,
  keyof Document
> = {
  actualPlanPrice: 199,
  actualPrice: 199,
  adid: '',
  cmsLoginEmail: 'test@gmail.com',
  cmsLoginId: 'test_cmsLoginId',
  cmsLoginName: 'test_cmsLoginName',
  cmsLoginNumber: 'test_cmsLoginNumber',
  country: 'india',
  couponCode: 'test_couponCode',
  couponPartnerName: 'test_couponPartnerName',
  couponStoreId: 11,
  couponStoreName: 'test_couponStoreName',
  createdAt: new Date(),
  currency: 'inr',
  currencySymbol: CurrencySymbolEnum.INR,
  deviceId: 'test_deviceId',
  dialect: 'har',
  discount: 0,
  email: 'test@gmail.com',
  gps_adid: 'test_gps_adid',
  idfa: 'test_idfa',
  isGlobal: true,
  isRecommended: true,
  isRecurring: true,
  isRecurringSubscription: true,
  isRenew: true,
  isTnplUser: true,
  isTrial: true,
  isUpgrade: true,
  itemId: 'test_itemId',
  juspayOrderId: 'test_juspayOrderId',
  latest_receipt: 'test_latest_receipt',
  latest_receipt_info: [], // You can populate with similar faker generated data
  mandateOrderId: new Types.ObjectId(),
  masterMandateId: new Types.ObjectId(),
  order: new Types.ObjectId(),
  os: 'android',
  partnerCustomerId: 'test_partnerCustomerId',
  payingPrice: 199,
  paymentGateway: 'PHP',
  pending_renewal_info: [], // You can populate with similar faker generated data
  planDays: '7',
  planId: 'test_planId',
  planType: 'test_planType',
  platform: 'app',
  playBillingPurchaseDetails: {
    acknowledged: true,
    autoRenewing: false,
    orderId: 'test_orderId',
    packageName: 'test_packageName',
    productId: 'test_productId',
    purchaseState: 0,
    purchaseTime: Date.now(),
    purchaseToken: 'test_purchaseToken',
    quantity: 1,
  },
  playBillingVerificationData: 'test',
  previousSubscription: {}, // Populate this object as needed
  primaryMobileNumber: '000000000000',
  providerId: 'test_providerId',
  receipt: 'test_receipt',
  // recieptInfo: receiptInfoData, // Populate this object as needed
  remarks: [],
  renewalRecurringCount: 4,
  saved: 1,
  signature: 'test_signature',
  status: 'test_status',
  subscriptionDate: new Date(),
  subscriptionId: 'test_subscriptionId',
  subscriptionThrough: 'test_subscriptionThrough',
  subscriptionValid: new Date(),
  totalCount: 5,
  updatedAt: new Date(),
  userId: '5f7c6b5e1c9d440000a1b1a1',
  vendor: PaymentGatewayEnum.SETU,
};
export const userSubscriptionsHistory: Omit<
  UserSubscriptionHistory,
  keyof Document
>[] = [
  {
    // __v: 1,
    // _id: new Types.ObjectId('5f7c6b5e1c9d440000a1b1a1'),
    actualPlanPrice: 199, //
    actualPrice: 199, //
    adid: 'none', //
    cmsLoginEmail: 'none', //
    cmsLoginId: 'none',
    cmsLoginName: 'none',
    cmsLoginNumber: 'none',
    country: 'IN',
    couponCode: 'none',
    createdAt: new Date('2024-09-20T05:33:49.233Z'),
    currency: CurrencyEnum.INR,
    currencySymbol: CurrencySymbolEnum.INR,
    deviceId: '1f8d229547bd5da9',
    dialect: 'har',
    discount: 0,
    email: 'example@example.com',
    gps_adid: 'e565a340-02f0-46b3-9439-deb40e6fc427',
    isGlobal: false,
    isRecommended: false,
    isRecurring: true,
    isRecurringSubscription: true,
    isRenew: true,
    isTrial: false,
    isUpgrade: false,
    itemId: 'quarterly_149',
    juspayOrderId: '66ed092ad41927343eb97667--1',
    latest_receipt: 'receipt_id',
    order: new Types.ObjectId('66ed092ad41927343eb97667'),
    os: 'android',
    payingPrice: 199,
    paymentGateway: 'Juspay_Recurring',
    planDays: '90',
    planId: 'quarterly_149',
    planType: 'Quarterly',
    platform: 'app',
    primaryMobileNumber: '2022123409',
    saved: 0,
    signature: 'none',
    status: 'active',
    subscriptionDate: new Date('2024-09-20T05:33:49.232Z'),
    subscriptionId: 'JUSPAY_T2409201103477054196093',
    subscriptionThrough: 'WEBHOOK',
    subscriptionValid: new Date('2024-12-19T05:33:49.231Z'),
    totalCount: 24,
    updatedAt: new Date('2024-09-20T05:33:49.233Z'),
    userId: '5f7c6b5e1c9d440000a1b1a1',
    vendor: PaymentGatewayEnum.JUSPAY,
  },
  {
    // __v: 1,
    // _id: new Types.ObjectId('5f7c6b5e1c9d440000a1b1a2'),
    actualPlanPrice: 199, //
    actualPrice: 199, //
    adid: 'none', //
    cmsLoginEmail: 'none', //
    cmsLoginId: 'none',
    cmsLoginName: 'none',
    cmsLoginNumber: 'none',
    country: 'IN',
    couponCode: 'none',
    createdAt: new Date('2024-09-20T05:33:49.233Z'),
    currency: CurrencyEnum.INR,
    currencySymbol: CurrencySymbolEnum.INR,
    deviceId: '1f8d229547bd5da9',
    dialect: 'har',
    discount: 0,
    email: 'example@example.com',
    gps_adid: 'e565a340-02f0-46b3-9439-deb40e6fc427',
    isGlobal: false,
    isRecommended: false,
    isRecurring: true,
    isRecurringSubscription: true,
    isRenew: true,
    isTrial: false,
    isUpgrade: false,
    itemId: 'quarterly_149',
    latest_receipt: 'receipt_id',
    os: 'android',
    payingPrice: 199,
    paymentGateway: 'Juspay_Recurring',
    planDays: '90',
    planId: 'quarterly_149',
    planType: 'Quarterly',
    platform: 'app',
    primaryMobileNumber: '2022123409',
    saved: 0,
    signature: 'none',
    status: 'active',
    subscriptionDate: new Date('2024-09-20T05:33:49.232Z'),
    subscriptionId: 'PHONEPE_T2409201103477054196096',
    subscriptionThrough: 'WEBHOOK',
    subscriptionValid: new Date('2024-12-19T05:33:49.231Z'),
    totalCount: 24,
    updatedAt: new Date('2024-09-20T05:33:49.233Z'),
    userId: '5f7c6b5e1c9d440000a1b1a2',
    vendor: PaymentGatewayEnum.PHONEPE,
  },
  {
    // __v: 1,
    // _id: new Types.ObjectId('5f7c6b5e1c9d440000a1b1a3'),
    actualPlanPrice: 199, //
    actualPrice: 199, //
    adid: 'none', //
    cmsLoginEmail: 'none', //
    cmsLoginId: 'none',
    cmsLoginName: 'none',
    cmsLoginNumber: 'none',
    country: 'IN',
    couponCode: 'none',
    createdAt: new Date('2024-09-20T05:33:49.233Z'),
    currency: CurrencyEnum.INR,
    currencySymbol: CurrencySymbolEnum.INR,
    deviceId: '1f8d229547bd5da9',
    dialect: 'har',
    discount: 0,
    email: 'example@example.com',
    gps_adid: 'e565a340-02f0-46b3-9439-deb40e6fc427',
    isGlobal: false,
    isRecommended: false,
    isRecurring: true,
    isRecurringSubscription: true,
    isRenew: true,
    isTrial: false,
    isUpgrade: false,
    itemId: 'quarterly_149',
    latest_receipt: 'receipt_id',
    os: 'android',
    payingPrice: 199,
    paymentGateway: 'Juspay_Recurring',
    planDays: '90',
    planId: 'quarterly_149',
    planType: 'Quarterly',
    platform: 'app',
    primaryMobileNumber: '2022123409',
    saved: 0,
    signature: 'none',
    status: 'active',
    subscriptionDate: new Date('2024-09-20T05:33:49.232Z'),
    subscriptionId: 'PAYTM_T2409201103477054196099',
    subscriptionThrough: 'WEBHOOK',
    subscriptionValid: new Date('2024-12-19T05:33:49.231Z'),
    totalCount: 24,
    updatedAt: new Date('2024-09-20T05:33:49.233Z'),
    userId: '5f7c6b5e1c9d440000a1b1a2',
    vendor: PaymentGatewayEnum.PAYTM,
  },
];
