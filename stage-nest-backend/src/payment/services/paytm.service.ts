import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import PaytmChecksum from 'paytmchecksum';

import { APP_CONFIGS } from '@app/common/configs/app.config';
import { convertDateToEpoch } from 'common/helpers/dateTime.helper';

import { PaytmDisputeActionEnum } from '../enums/dispute.enums';
import { IPaytmContestDisputeResponse } from 'src/payment/dtos/responses/paytmContestDispute.response.interface';

const { PAYTM: paytmConfigs } = APP_CONFIGS;

interface ContestData {
  action: PaytmDisputeActionEnum;
  disputeId: string;
  mid: string | undefined;
  orderStatus: string;
  requestTimestamp: number;
  signature?: string;
}

@Injectable()
export class PaytmService {
  /**
   * contest the paytm dispute
   *
   * @param {string} disputeId - paytm dispute id
   * @param {number} amount - amount to contest
   * @returns
   */
  public async contestPaytmDispute(
    disputeId: string,
  ): Promise<IPaytmContestDisputeResponse | undefined> {
    // FIXME: uncomment invoice fetching code when invoice is ready
    // const url = '';
    // const s3 = new AWS.S3();
    // const bucketName = 'your-bucket-name';
    // const key = 'path_to_invoice.pdf';

    // Create a read stream from S3
    // const s3Stream = s3
    //   .getObject({ Bucket: bucketName, Key: key })
    //   .createReadStream();

    const form = new FormData();
    form.append('files', 'dispute_evidence');
    // form.append('files', s3Stream);
    const contestData: ContestData = {
      action: PaytmDisputeActionEnum.DEFEND,
      disputeId,
      mid: paytmConfigs.MERCHANT_ID,
      orderStatus: 'ORDER_IN_TRANSIT',
      requestTimestamp: convertDateToEpoch(new Date()),
    };

    // FIXME: type of contestData is ContestData but the generateChecksum method expects a PaytmChecksum.PaytmParamsBody
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const checksum = await this.generateChecksum(contestData);

    // FIXME: type of contestData is ContestData but the signature is not being used
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    contestData.signature = checksum;

    const options: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        ...form.getHeaders(),
      },
    };

    const uri = paytmConfigs.DISPUTE_URL_PATH;
    const response = await axios.post(uri, contestData, options);

    return response.data;
  }

  public async generateChecksum(
    body: string | PaytmChecksum.PaytmParamsBody,
  ): Promise<string> {
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(body),
      paytmConfigs.MERCHANT_KEY,
    );
    return checksum;
  }

  public async validateChecksum(
    body: string | PaytmChecksum.PaytmParamsBody,
    signature: string,
  ): Promise<boolean> {
    const isValidSignature: boolean = await PaytmChecksum.verifySignature(
      body,
      paytmConfigs.MERCHANT_KEY,
      signature,
    );
    return isValidSignature;
  }
}
