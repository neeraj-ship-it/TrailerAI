// import { TestBed } from '@automock/jest';

import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
//import { MandateV2Repository } from '@app/shared/repositories/mandateV2.repository';
import { Plan } from 'common/entities/plan.entity';
import { plans } from 'tests/seeds/plan';
import { getTestEntity } from 'tests/testSetup';
import {
  generateAuthToken,
  makeAuthenticatedAdminRequest,
  makeAuthenticatedRequest,
} from 'tests/utils/makeRequest';

const createMandateApi = '/payments/mandate/create';
const migratePlanApi = '/admin/plan/migrate';

describe('Setu: Initiate Mandate Creation', () => {
  // const mandateRepositoryV2 = TestBed.create(MandateV2Repository).compile();

  beforeAll(async () => {
    const planEntity = getTestEntity<Plan>(Plan.name);
    await planEntity.insertMany(plans);

    const authToken = await generateAuthToken({
      userId: '5f7c6b5e1c9d440000a1b1a2',
    });

    const response = await makeAuthenticatedAdminRequest(authToken)
      .post(migratePlanApi)
      .send({
        planId: plans[0].planId,
      });
    expect(response.status).toBe(201);
  });
  it("should create a mandate if doesn't exist", async () => {
    const authToken = await generateAuthToken({
      userId: '5f7c6b5e1c9d440000a1b1a2',
    });

    const response = await makeAuthenticatedRequest(authToken)
      .post(createMandateApi)
      .send({
        paymentGateway: PaymentGatewayEnum.SETU,
        selectedPlan: plans[0].planId,
        targetPaymentProcessor: 'phonepe',
      });
    console.log(response.body);

    expect(response.status).toBe(201);
  });

  it('should not create another mandate if user already has an existing mandate', async () => {
    const userId = '5f7c6b5e1c9d440000a1b1a2';
    const authToken = await generateAuthToken({
      userId,
    });
    // const mandateEntity = testSetupService.getTestEntity(MandateV2.name);
    // if (!mandateEntity) {
    //   console.log('Failed to get mandate entity');
    //   return;
    // }
    const response = await makeAuthenticatedRequest(authToken)
      .post(createMandateApi)
      .send({
        paymentGateway: PaymentGatewayEnum.SETU,
        selectedPlan: plans[0].planId,
        targetPaymentProcessor: 'other',
      });

    console.log(response.body);
  });
  it('Should return PhonePe intent link', async () => {
    const userId = '5f7c6b5e1c9d440000a1b1a2';
    const authToken = await generateAuthToken({
      userId,
    });
    const response = await makeAuthenticatedRequest(authToken)
      .post(createMandateApi)
      .send({
        paymentGateway: PaymentGatewayEnum.SETU,
        selectedPlan: plans[0].planId,
        targetPaymentProcessor: 'phonepe',
      });
    console.log(response.body);
    expect(response.status).toBe(201);
    expect(response.body.upiIntentLink.startsWith('phonepe://mandate')).toBe(
      true,
    );
  });
  it('Should return Gpay intent link', async () => {
    const userId = '5f7c6b5e1c9d440000a1b1a2';
    const authToken = await generateAuthToken({
      userId,
    });
    const response = await makeAuthenticatedRequest(authToken)
      .post(createMandateApi)
      .send({
        paymentGateway: PaymentGatewayEnum.SETU,
        selectedPlan: plans[0].planId,
        targetPaymentProcessor: 'gpay',
      });
    console.log(response.body);
    expect(response.status).toBe(201);
    expect(response.body.upiIntentLink.startsWith('tez://mandate')).toBe(true);
  });
  it('Should return PayTm intent link', async () => {
    const userId = '5f7c6b5e1c9d440000a1b1a2';
    const authToken = await generateAuthToken({
      userId,
    });
    const response = await makeAuthenticatedRequest(authToken)
      .post(createMandateApi)
      .send({
        paymentGateway: PaymentGatewayEnum.SETU,
        selectedPlan: plans[0].planId,
        targetPaymentProcessor: 'paytm',
      });
    console.log(response.body);
    expect(response.status).toBe(201);
    expect(response.body.upiIntentLink.startsWith('paytmmp://mandate')).toBe(
      true,
    );
  });
});
