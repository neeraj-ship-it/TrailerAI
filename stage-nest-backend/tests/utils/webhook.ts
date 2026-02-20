import {
  SetuEventOperation,
  SetuEventStatus,
  SetuResource,
  SetuWebhookPayloadDto,
} from '@app/payment/psps/setu/dto/setu.webhook.dto';

export const generateSetuMandateCreationSuccessCallback = ({
  merchantReferenceId,
}: {
  merchantReferenceId: string;
}): SetuWebhookPayloadDto => ({
  amount: 19900,
  amountLimit: 19900,
  endDate: '09102054',
  eventId: '418632cc-c2b8-4183-9875-ad46176f7c5f',
  eventTs: '2024-10-16T20:30:22+05:30',
  eventType: 'mandate_operation.create.success',
  id: '01JAAXEJDN2HHGCMNCA8G3FAQG',
  mandateId: 'test_mandate_id',
  merchantId: '01J6HHA8N2R9RJA1WYJ7V2JBK5',
  merchantReferenceId,
  operation: SetuEventOperation.CREATE,
  reason: {
    code: 'mandate-live',
    desc: 'mandate is live',
    npciErrCategory: 'NA',
    npciErrCode: '00',
    npciErrDesc: 'SUCCESS',
    npciRespCode: '00',
    npciRespDesc: 'SUCCESS',
    setuDescription: '',
    suggestedAction: '',
  },
  resource: SetuResource.MANDATE_OPERATION,
  status: SetuEventStatus.SUCCESS,
  txnId: 'SETUuEssQ4I9PyMyYyNJMNC3EIbrROEtIWa',
  txnTs: '2024-10-16T20:30:22+05:30',
  umn: 'SETUB08467671RdZWpmGYksYaU9cdFtuEv@mypsp',
});
