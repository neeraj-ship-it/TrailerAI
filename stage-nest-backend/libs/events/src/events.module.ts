import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { EventService } from './events.service';
import { AmplitudeEventService } from './services/amplitude.service';
import { AppsFlyerEventService } from './services/appsflyer.service';
import { CleverTapEventService } from './services/clever-tap.service';
import { FirebaseEventService } from './services/firebase.service';
import { RudderStackEventService } from './services/rudderstack.service';
import { User } from '@app/common/entities/user.entity';
import { UserRepository } from '@app/common/repositories/user.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';

@Module({
  exports: [EventService, RudderStackEventService],
  imports: [
    ErrorHandlerModule,
    // This is a duplicate registration of the user model due.
    MongooseModule.forFeature([createModelDefinition(User)]),
    RepositoryCacheModule,
  ],
  providers: [
    EventService,
    AmplitudeEventService,
    FirebaseEventService,
    AppsFlyerEventService,
    CleverTapEventService,
    RudderStackEventService,
    UserRepository, // Had to import the user repository here to avoid circular dependency
  ],
})
export class EventsModule {}
