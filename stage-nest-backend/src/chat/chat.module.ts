import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '@app/auth';
import { ErrorHandlerModule } from '@app/error-handler';
import { RedisModule } from '@app/redis';
import { RepositoryCacheModule } from '@app/repository-cache';

import { createModelDefinition } from 'common/utils/mongoose.utils';

import { CharacterController } from './controllers/character.controller';
import { ChatController } from './controllers/chat.controller';
import { Character } from './entities/character.entity';
import { CharacterRepository } from './repositories/character.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { Conversation } from './schemas/conversation.schema';
import { CharacterService } from './services/character.service';
import { ConversationService } from './services/conversation.service';
import { LLMService } from './services/llm.service';
import { SessionService } from './services/session.service';

@Module({
  controllers: [ChatController, CharacterController],
  exports: [CharacterService, SessionService, ConversationService, LLMService],
  imports: [
    AuthModule,
    ConfigModule,
    ErrorHandlerModule,
    RedisModule,
    RepositoryCacheModule,
    RouterModule.register([{ module: ChatModule, path: 'chat' }]),
    MongooseModule.forFeature([
      createModelDefinition(Conversation),
      createModelDefinition(Character),
    ]),
  ],
  providers: [
    CharacterService,
    CharacterRepository,
    SessionService,
    LLMService,
    ConversationService,
    ConversationRepository,
  ],
})
export class ChatModule {}
