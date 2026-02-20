import { Types } from 'mongoose';

import { TestBed } from '@automock/jest';

import { SetuGatewayAdapter } from '@app/payment/psps/setu/adapter.setu';
import { Plan } from 'common/entities/plan.entity';
import { MasterMandateStatusEnum } from 'common/enums/common.enums';
import { addDaysToDate } from 'common/helpers/dateTime.helper';
import {
  MandateTransactions,
  MandateTransactionStatus,
} from 'src/payment/entities/mandateTransactions.entity';
import { PaymentGatewayEnum } from 'src/payment/enums/paymentGateway.enums';
import { MandateV2 } from 'src/shared/entities/mandateV2.entity';
import {
  UserSubscriptionStatusV2,
  UserSubscriptionV2,
} from 'src/shared/entities/userSubscriptionV2.entity';
import { getTestEntity } from 'tests/testSetup';
import { makePublicRequest } from 'tests/utils/makeRequest';
import { generateSetuMandateCreationSuccessCallback } from 'tests/utils/webhook';
describe('Handle Mandate Creation Callback', () => {
  const userId = '5f7c6b5e1c9d440000a1b1a2';
  const SETU_CALLBACK_URL = '/payments/webhooks/setu';
  const { unit: setuGatewayAdapter } =
    TestBed.create(SetuGatewayAdapter).compile();
  it('Send Mandate Success Callback', async () => {
    const mandateEntity = getTestEntity(MandateV2.name);
    const mandate = await mandateEntity.findOne({
      status: MasterMandateStatusEnum.MANDATE_INITIATED,
      user: new Types.ObjectId(userId),
    });
    if (!mandate) {
      throw new Error('Mandate not found');
    }
    const callbackPayload = generateSetuMandateCreationSuccessCallback({
      merchantReferenceId: mandate._id.toString(),
    });
    const response = await makePublicRequest()
      .post(SETU_CALLBACK_URL)
      .set(
        'x-setu-signature',
        setuGatewayAdapter.generateSignature({
          verificationPayload: JSON.stringify(callbackPayload),
        }),
      )
      .send(callbackPayload);

    expect(response.status).toBe(200);
    // Validate DB changes
    // Validate changes in the mandate
    const mandateAfterCallback: MandateV2 | null = await mandateEntity.findOne({
      _id: mandate._id,
    });
    if (!mandateAfterCallback) {
      throw new Error('Mandate not found');
    }
    expect(mandateAfterCallback.status).toBe(
      MasterMandateStatusEnum.MANDATE_ACTIVE,
    );
    expect(mandateAfterCallback.pg).toBe(PaymentGatewayEnum.SETU);
    // expect(mandateAfterCallback.pgMandateId).toBe(callbackPayload.umn);
    expect(mandateAfterCallback.statusHistory.length).toBe(2);
    expect(mandateAfterCallback.statusHistory[0].status).toBe(
      MasterMandateStatusEnum.MANDATE_ACTIVE,
    );
    expect(mandateAfterCallback.statusHistory[1].status).toBe(
      MasterMandateStatusEnum.MANDATE_INITIATED,
    );
    // Validate changes in the mandate transactions
    const mandateTransactions = getTestEntity<MandateTransactions>(
      MandateTransactions.name,
    );
    const mandateTransaction = await mandateTransactions.findOne({
      mandateId: new Types.ObjectId(mandate._id),
    });
    if (!mandateTransaction) {
      throw new Error('Mandate transaction not found');
    }
    const plan = getTestEntity<Plan>(Plan.name);
    const planData: Plan | null = await plan.findOne({
      _id: mandateAfterCallback.plan,
    });
    if (!planData) {
      throw new Error('Plan data not found');
    }
    expect(mandateTransaction.txnStatus).toBe(MandateTransactionStatus.SUCCESS);
    expect(mandateTransaction.txnAmount).toBe(planData.payingPrice);

    // validate user subscription
    const userSubscription = await getTestEntity<UserSubscriptionV2>(
      UserSubscriptionV2.name,
    );
    const userSubscriptionData: UserSubscriptionV2 | null =
      await userSubscription.findOne({
        mandateId: new Types.ObjectId(mandate._id),
        userId: new Types.ObjectId(userId),
      });
    if (!userSubscriptionData) {
      throw new Error('User subscription data not found');
    }
    expect(userSubscriptionData.plan).toBe(planData._id.toString());
    expect(userSubscriptionData.status).toBe(UserSubscriptionStatusV2.ACTIVE);
    expect(new Date(userSubscriptionData.endAt).getTime()).toBeCloseTo(
      addDaysToDate(new Date(), Number(planData.dayCount)).getTime(),
    );
  });
});
