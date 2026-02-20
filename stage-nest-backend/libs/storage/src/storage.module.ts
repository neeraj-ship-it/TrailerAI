import { Module } from '@nestjs/common';

import { S3Service } from './s3.service';
import { ErrorHandlerModule } from '@app/error-handler';

@Module({
  exports: [S3Service],
  imports: [ErrorHandlerModule],
  providers: [S3Service],
})
export class StorageModule {}
