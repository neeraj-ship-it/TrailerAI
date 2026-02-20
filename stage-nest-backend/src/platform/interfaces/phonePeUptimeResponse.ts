export interface PhonePeUptimeResponse {
  instruments: {
    DEBIT_CARD: {
      health: 'UP' | 'DOWN';
    };
    CREDIT_CARD: {
      health: 'UP' | 'DOWN';
    };
    UPI: {
      health: 'UP' | 'DOWN';
    };
    NET_BANKING: {
      health: 'UP' | 'DOWN';
    };
    WALLET: {
      health: 'UP' | 'DOWN';
    };
  };
  overallHealth: 'UP' | 'DOWN';
}
