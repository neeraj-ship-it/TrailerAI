import { Injectable, Logger } from '@nestjs/common';

import {
  IAllInvoiceRequest,
  InvoiceResponse,
} from '../dtos/invoice.request.dto';
import { PlanRepository } from '../repositories/plan.repository';
import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { Lang } from '@app/common/enums/app.enum';
import { PaginatedQueryResponse } from '@app/common/repositories/base.repository';
import { UserSubscriptionHistoryRepository } from '@app/common/repositories/userSubscriptionHistory.repository';
import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class InvoiceService {
  private logger = new Logger(InvoiceService.name);

  constructor(
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
    private readonly planRepository: PlanRepository,
    private readonly errorHandlerService: ErrorHandlerService,
  ) {}

  // fetch all invoices for the user in paginated format
  public async fetchAllUserInvoices(
    allInvoiceRequest: IAllInvoiceRequest,
  ): Promise<PaginatedResponseDTO<InvoiceResponse>> {
    const { lang, page, perPage, userId } = allInvoiceRequest;

    // fetch user subscriptions in paginated format
    const userSubscriptionsResponse: PaginatedQueryResponse<
      Pick<
        UserSubscriptionHistory,
        | 'payingPrice'
        | 'planId'
        | 'subscriptionDate'
        | 'subscriptionValid'
        | 'currencySymbol'
        | '_id'
      >
    > = await this.userSubscriptionHistoryRepository.findPaginated({
      filter: { userId },
      options: {
        pagination: { page: page, perPage: perPage },
        sort: { createdAt: -1 },
      },
      projections: [
        '_id',
        'payingPrice',
        'subscriptionDate',
        'subscriptionValid',
        'planId',
        'currencySymbol',
      ],
    });

    // Return on no data
    if (userSubscriptionsResponse.data.length === 0) {
      return {
        data: [],
        ...userSubscriptionsResponse.pagination,
      };
    }

    const invoicesData: InvoiceResponse[] = [];
    const planIdSet = new Set();

    for (const userSubscription of userSubscriptionsResponse.data) {
      const {
        _id,
        currencySymbol,
        payingPrice,
        planId,
        subscriptionDate,
        subscriptionValid,
      } = userSubscription;
      planIdSet.add(planId);

      const invoiceData: InvoiceResponse = {
        currencySymbol,
        payingPrice,
        planName: '',
        subscriptionDate,
        subscriptionId: _id.toString(),
        subscriptionValid,
      };

      invoicesData.push(invoiceData);
    }

    const planNameLang = lang == Lang.EN ? 'planTypeText' : 'planTypeTextHin';

    const findPlans = this.planRepository.find(
      { planId: { $in: Array.from(planIdSet) } },
      ['planId', planNameLang],
    );

    const plans = await this.errorHandlerService.raiseErrorIfNullAsync(
      findPlans,
      Errors.PLAN.NOT_FOUND(),
    );

    for (const invoiceData of invoicesData) {
      const userSubscription = userSubscriptionsResponse.data.find(
        (userSubscription) =>
          userSubscription._id.toString() === invoiceData.subscriptionId,
      );
      const planId = userSubscription?.planId;
      const plan = plans.find((plan) => plan.planId === planId);
      if (plan) {
        invoiceData.planName = plan[planNameLang];
      }
    }

    const allInvoiceResponse: PaginatedResponseDTO<InvoiceResponse> = {
      data: invoicesData,
      ...userSubscriptionsResponse.pagination,
    };

    return allInvoiceResponse;
  }
}
