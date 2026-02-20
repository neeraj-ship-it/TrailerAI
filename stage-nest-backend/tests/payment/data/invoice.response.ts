import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';
import { UserSubscriptionHistory } from '@app/common/entities/userSubscriptionHistory.entity';
import { InvoiceResponse } from '@app/payment/dtos/invoice.request.dto';

export const generateInvoiceResponse = (
  page: number,
  perPage: number,
  nextPageAvailable: boolean,
  userSubscriptionHistoryList: UserSubscriptionHistory[],
): PaginatedResponseDTO<InvoiceResponse> => {
  const subscriptionCount = userSubscriptionHistoryList.length;

  const invoicesData: InvoiceResponse[] = [];
  for (let i = 0; i < subscriptionCount; i++) {
    const invoiceData = getInvoiceData(userSubscriptionHistoryList[i]);
    invoicesData.push(invoiceData);
  }

  return {
    data: invoicesData,
    nextPageAvailable,
    page,
    perPage,
  };
};

const getInvoiceData = (userSubscriptionHistory: UserSubscriptionHistory) => {
  const {
    _id,
    currencySymbol,
    payingPrice,
    subscriptionDate,
    subscriptionValid,
  } = userSubscriptionHistory;
  return {
    currencySymbol,
    payingPrice,
    planName: '',
    subscriptionDate,
    subscriptionId: _id.toString(),
    subscriptionValid,
  };
};
