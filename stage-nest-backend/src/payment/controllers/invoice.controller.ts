import { TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import {
  IAllInvoiceRequest,
  InvoiceResponse,
} from '../dtos/invoice.request.dto';
import { InvoiceService } from '../services/invoice.service';
import { type Context, Ctx } from '@app/auth';
import { PaginatedRequestDTO } from '@app/common/dtos/paginated.request.dto';
import { PaginatedResponseDTO } from '@app/common/dtos/paginated.response.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @TypedRoute.Get('all')
  async fetchAllUserInvoices(
    @Ctx() ctx: Context,
    @TypedQuery() query: PaginatedRequestDTO,
  ): Promise<PaginatedResponseDTO<InvoiceResponse>> {
    const { page, perPage } = query;
    const { meta, user } = ctx;
    const { lang } = meta;
    const allInvoiceRequest: IAllInvoiceRequest = {
      lang,
      page,
      perPage,
      userId: user.id,
    };

    return this.invoiceService.fetchAllUserInvoices(allInvoiceRequest);
  }
}
