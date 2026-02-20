import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';

import { Logger } from '@nestjs/common';

import { PaymentStringConstants } from '../constants/payment-string.constant';
import { APP_CONFIGS } from '@app/common/configs/app.config';

const { RAZORPAY: razorpayConfigs } = APP_CONFIGS;

@Injectable()
export class RazorpayService {
  private logger = new Logger(RazorpayService.name);

  /**
   * contest the razorpay dispute
   *
   * @param {string} disputeId - razorpay dispute id
   * @param {number} amount - amount to contest
   * @returns
   */
  public async contestRazorpayDispute(
    disputeId: string,
    amount: number,
    disputeDocumentId: string,
  ): Promise<AxiosResponse | undefined> {
    const contestData = {
      action: PaymentStringConstants.disputeActionSubmit,
      amount: amount,
      others: [
        {
          document_ids: [disputeDocumentId],
          type: PaymentStringConstants.refundCancellationPolicyType,
        },
      ],
      summary: PaymentStringConstants.razorpayDisputeSummary,
    };

    const options: AxiosRequestConfig = {
      auth: {
        password: razorpayConfigs.KEY_SECRET,
        username: razorpayConfigs.KEY_ID,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const uri = `${APP_CONFIGS.RAZORPAY.API_URL}/v1/disputes/${disputeId}/contest`;
    const response = await axios.patch(uri, contestData, options);

    return response.data;
  }

  /**
   * contest the razorpay dispute
   *
   * @param {string} disputeId - razorpay dispute id
   * @param {number} amount - amount to contest
   * @returns
   */
  public async createRazorpayDocument(paymentId: string) {
    // TODO: fetch invoice information from the database
    this.logger.debug(
      `fetch invoice information from the database using ${paymentId}`,
    );
    // const url = '';

    // FIXME: uncomment invoice fetching code when invoice is ready
    // const s3 = new AWS.S3();
    // const bucketName = 'your-bucket-name';
    // const key = 'path_to_invoice.pdf';

    // Create a read stream from S3
    // const s3Stream = s3
    //   .getObject({ Bucket: bucketName, Key: key })
    //   .createReadStream();

    const form = new FormData();
    form.append('purpose', 'dispute_evidence');
    // form.append('file', s3Stream, { filename: 'sample_uploaded.jpeg' }); // FIXME: uncomment when invoice is ready

    // REVIEW_THIS: if you want to upload a file from local or request
    // form.append(
    //   'file',
    //   fs.createReadStream('/path/to/your/sample_uploaded.jpeg'),
    // );

    const options: AxiosRequestConfig = {
      auth: {
        password: razorpayConfigs.KEY_SECRET,
        username: razorpayConfigs.KEY_ID,
      },
      headers: {
        'Content-Type': 'multipart/form-data',
        ...form.getHeaders(),
      },
    };

    const uri = `${APP_CONFIGS.RAZORPAY.API_URL}/v1/documents`;
    const response = await axios.post(uri, {}, options);

    return response.data;
  }
}
