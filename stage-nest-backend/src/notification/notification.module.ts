import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';

import { MongooseModule } from '@nestjs/mongoose';

import { SmsAdapter } from './adapters/sms.adapter';
import { WhatsappAdapter } from './adapters/whatsapp.adapter';
import { CeletelSMSGateway } from './gateways/celetel.sms.gateway';
import { CeletelWhatsappGateway } from './gateways/celetel.whatsapp.gateway';
import { GupshupGateway } from './gateways/gupshup.sms.gateway';
import { GupshupWhatsappGateway } from './gateways/gupshup.whatsapp.gateway';
import { SlackGateway } from './gateways/slack.gateway';
import { NotificationConsumer } from './services/notificationConsumer.service';
import { NotificationDispatcher } from './services/notificationDispatcher.service';
import { NotificationProcessorService } from './services/notificationProcessor.service';
import { NotificationRecipientService } from './services/notificationRecipient.service';
import { QUEUES } from '@app/common/constants/queues.const';
import { User } from '@app/common/entities/user.entity';
import { UserRepository } from '@app/common/repositories/user.repository';
import { createModelDefinition } from '@app/common/utils/mongoose.utils';
import { ErrorHandlerModule } from '@app/error-handler';
import { RepositoryCacheModule } from '@app/repository-cache';

@Module({
  exports: [NotificationDispatcher],
  imports: [
    RepositoryCacheModule,
    ErrorHandlerModule,
    BullModule.registerQueue({
      name: QUEUES.NOTIFICATIONS,
    }),
    MongooseModule.forFeature([createModelDefinition(User)]),
  ],
  providers: [
    SlackGateway,
    UserRepository,
    SmsAdapter,
    CeletelSMSGateway,
    CeletelWhatsappGateway,
    GupshupGateway,
    NotificationDispatcher,
    NotificationConsumer,
    NotificationProcessorService,
    WhatsappAdapter,
    GupshupWhatsappGateway,
    NotificationRecipientService,
  ],
})
export class NotificationModule {}
