import { Module } from '@nestjs/common';

import { ErrorHandlerService } from './errorHandler.service';

@Module({
  exports: [ErrorHandlerService],
  providers: [ErrorHandlerService],
})
export class ErrorHandlerModule {}
