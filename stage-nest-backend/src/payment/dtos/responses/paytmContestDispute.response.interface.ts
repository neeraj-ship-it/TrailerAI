export interface IPaytmContestDisputeResponse {
  disputeId: string;
  mid: string;
  resultInfo: {
    resultStatus: string;
    resultCodeId: string;
    resultCode: string;
    resultMsg: string;
  };
}
