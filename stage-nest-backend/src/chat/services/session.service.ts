import { Injectable, Logger } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import { Errors } from '@app/error-handler';
import { RedisService } from '@app/redis';

import {
  type CreateSessionResponseDto,
  type CreateSessionRequestDto,
} from '../dto/chat-message.dto';
import { type ChatSession } from '../interfaces/character.interface';
import { CharacterService } from './character.service';
import { ConversationService } from './conversation.service';

import { REDIS_SESSION } from '../constants/chat.constants';

/**
 * Session Service
 * Manages chat sessions in Redis with automatic expiration
 * Sessions are temporary and synced to MongoDB for persistence
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly characterService: CharacterService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Create new chat session
   * Handles character validation, session creation, and persistence
   */
  async createChatSession(
    userId: string,
    body: CreateSessionRequestDto,
    lang: string,
    platform: string,
  ): Promise<CreateSessionResponseDto> {
    const character = await this.characterService.getCharacterById(
      body.character,
    );

    if (!character) {
      throw Errors.CONTENT.NO_CONTENT_FOUND('Character not found');
    }

    const sessionId = this.generateSessionId();

    const session: ChatSession = {
      characterId: character.slug,
      createdAt: new Date(),
      dialect: character.dialect,
      id: sessionId,
      lang,
      messages: [
        {
          content: character.systemPrompt,
          role: 'system',
          timestamp: new Date(),
        },
      ],
      platform,
      showSlug: character.showSlug,
      userId,
    };

    // Save to Redis
    await this.saveSession(session);

    // Persist to MongoDB
    await this.conversationService.createConversation(session);

    this.logger.log(
      `Created session ${sessionId} for character ${character.slug}`,
    );

    return {
      character: {
        avatar: character.avatar,
        id: character.slug,
        name: character.name,
      },
      greeting: character.greeting,
      sessionId,
    };
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = REDIS_SESSION.PREFIX + sessionId;
    await this.redisService.del(key);
  }

  /**
   * Generate new unique session ID
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Get session from Redis
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const key = REDIS_SESSION.PREFIX + sessionId;
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as ChatSession;
    } catch (error) {
      this.logger.error(`Failed to parse session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session timestamp and refresh TTL
   */
  async refreshSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.updatedAt = new Date();
      await this.saveSession(session);
    }
  }

  /**
   * Save session to Redis with automatic expiration
   * TTL is set to 24 hours from save time
   */
  async saveSession(session: ChatSession): Promise<void> {
    const key = REDIS_SESSION.PREFIX + session.id;
    await this.redisService.set(
      key,
      JSON.stringify(session),
      REDIS_SESSION.TTL,
    );
  }
}
