export enum DisputeStatusEnum {
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  CLOSED = 'CLOSED',
  CREATED = 'CREATED',
  LOST = 'LOST',
  UNDER_REVIEW = 'UNDER_REVIEW',
  WON = 'WON',
}

export enum RazorpayDisputeEnum {
  ACTION_REQUIRED = 'payment.dispute.action_required',
  CLOSED = 'payment.dispute.closed',
  CREATED = 'payment.dispute.created',
  LOST = 'payment.dispute.lost',
  UNDER_REVIEW = 'payment.dispute.under_review',
  WON = 'payment.dispute.won',
}

export enum PaytmDisputeEnum {
  Accept = 'Accept',
  NEW = 'NEW',
}

export enum PaytmDisputeActionEnum {
  ACCEPT = 'ACCEPT',
  DEFEND = 'DEFEND',
}
