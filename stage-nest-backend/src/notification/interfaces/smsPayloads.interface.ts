export interface SendLoginOtp {
  hashKey: string;
  otp: string;
  recipient: string;
}

export interface SendRefundNotification {
  phoneNumber: string;
}
