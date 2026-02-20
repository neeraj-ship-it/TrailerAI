import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core/router/router-module';

import { AuthModule } from '@app/auth';
import { ErrorHandlerModule } from '@app/error-handler';

import { MongooseModule } from '@nestjs/mongoose';

import { ExternalLoginController } from './controllers/externalLogin.controller';
import { FutworkController } from './controllers/futwork.controller';
import { ExternalLoginGuard } from './guards/external.login.guard';
import { FutworkService } from './services/futwork.service';
import { InternalExpressService } from './services/internal.express.service';
import { JioService } from './services/jio.service';
import { JioSsoLoginValidation } from './services/jioSsoLoginValidation';
import { PartnerFactory } from './services/partner.factory';
import { StcService } from './services/stc.service';
import { StcLoginValidation } from './services/stcLoginValidation';

import { UserSubscriptionV1Repository } from '@app/common/repositories/userSubscriptionV1.repository';
import { UserSubscriptionUtil } from '@app/common/utils/userSubscription.util';
import { EventsModule } from '@app/events';
import { RepositoryCacheModule } from '@app/repository-cache';
import { UserSubscriptionV1 } from 'common/entities/userSubscription.entity';
import { createModelDefinition } from 'common/utils/mongoose.utils';
import { UserModule } from 'src/users/user.module';

@Module({
  controllers: [ExternalLoginController, FutworkController],
  exports: [
    JioService,
    StcService,
    PartnerFactory,
    InternalExpressService,
    JioSsoLoginValidation,
    StcLoginValidation,
    ExternalLoginGuard,
    FutworkService,
  ],
  imports: [
    AuthModule,
    ErrorHandlerModule,
    RouterModule.register([{ module: PartnerModule, path: 'partner' }]),
    UserModule,
    MongooseModule.forFeature([createModelDefinition(UserSubscriptionV1)]),
    RepositoryCacheModule,
    EventsModule,
  ],
  providers: [
    JioService,
    StcService,
    PartnerFactory,
    InternalExpressService,
    JioSsoLoginValidation,
    StcLoginValidation,
    ExternalLoginGuard,
    UserSubscriptionUtil,
    UserSubscriptionV1Repository,
    FutworkService,
  ],
})
export class PartnerModule {}
