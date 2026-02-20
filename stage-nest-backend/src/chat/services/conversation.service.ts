import { Injectable, Logger } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';

import { Errors } from '@app/error-handler';

import {
  type CharacterHistoryDto,
  type GetHistoryResponseDto,
} from '../dto/character.dto';
import {
  type ChatMessageRequestDto,
  type ChatMessageResponseDto,
} from '../dto/chat-message.dto';
import {
  type ChatMessage,
  type ChatSession,
} from '../interfaces/character.interface';
import { ConversationRepository } from '../repositories/conversation.repository';
import { Conversation } from '../schemas/conversation.schema';
import { CharacterService } from './character.service';
import { LLMService } from './llm.service';
import { SessionService } from './session.service';

/**
 * Conversation Service
 * Orchestrates chat conversations between business logic, LLM, and persistence layers
 *
 * Responsibilities:
 * - Managing chat message flow
 * - Coordinating between Redis sessions and MongoDB persistence
 * - Streaming responses via SSE
 * - Building response DTOs
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterService: CharacterService,
    private readonly llmService: LLMService,
  ) {}

  /**
   * Handle SSE streaming logic
   * Separated for better readability and testability
   */
  private async handleStreamMessage(
    userId: string,
    sessionId: string,
    message: string,
    sessionService: SessionService,
    observer: Subscriber<MessageEvent>,
  ): Promise<void> {
    // Validate and get session
    const session = await this.validateAndGetSession(
      userId,
      sessionId,
      sessionService,
      observer,
    );

    if (!session) {
      return; // Error already sent to observer
    }

    // Add user message
    session.messages.push({
      content: message,
      role: 'user',
      timestamp: new Date(),
    });

    this.logger.debug(`Calling LLM with ${session.messages.length} messages`);

    // Stream LLM response
    const fullResponse = await this.streamLLMResponse(session, observer);

    // Save assistant response
    session.messages.push({
      content: fullResponse,
      role: 'assistant',
      timestamp: new Date(),
    });

    // Persist session
    await sessionService.saveSession(session);
    await this.syncSession(session);

    this.logger.log(
      `Stream completed - Session: ${sessionId}, Response length: ${fullResponse.length}`,
    );

    // Send completion signal
    observer.next({
      data: {
        done: true,
        sessionId,
        token: '',
      },
    } as MessageEvent);

    observer.complete();
  }

  /**
   * Stream tokens from LLM and send via SSE
   */
  private async streamLLMResponse(
    session: ChatSession,
    observer: Subscriber<MessageEvent>,
  ): Promise<string> {
    let fullResponse = '';

    for await (const token of this.llmService.streamChatCompletion(
      session.messages,
    )) {
      fullResponse += token;

      observer.next({
        data: {
          done: false,
          token,
        },
      } as MessageEvent);
    }

    return fullResponse;
  }

  /**
   * Validate session and authorization
   */
  private async validateAndGetSession(
    userId: string,
    sessionId: string,
    sessionService: SessionService,
    observer: Subscriber<MessageEvent>,
  ): Promise<ChatSession | null> {
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      observer.next({
        data: {
          done: true,
          error: 'Session not found',
          token: '',
        },
      } as MessageEvent);
      observer.complete();
      return null;
    }

    if (session.userId !== userId) {
      this.logger.warn(
        `Unauthorized access attempt - Session: ${sessionId}, User: ${userId}`,
      );
      observer.next({
        data: {
          done: true,
          error: 'Unauthorized',
          token: '',
        },
      } as MessageEvent);
      observer.complete();
      return null;
    }

    return session;
  }

  /**
   * Add message to existing conversation
   */
  async addMessage(
    sessionId: string,
    message: ChatMessage,
  ): Promise<Conversation | null> {
    return this.conversationRepository.addMessage(sessionId, {
      content: message.content,
      role: message.role,
      timestamp: message.timestamp || new Date(),
    });
  }

  /**
   * Create new conversation in MongoDB
   */
  async createConversation(session: ChatSession): Promise<Conversation> {
    const conversation = await this.conversationRepository.create({
      characterId: session.characterId,
      dialect: session.dialect,
      messages: session.messages.map((msg) => ({
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp || new Date(),
      })),
      sessionId: session.id,
      showSlug: session.showSlug,
      userId: session.userId,
    } as Conversation);

    return conversation;
  }

  /**
   * Get conversation by session ID
   */
  async getConversation(sessionId: string): Promise<Conversation | null> {
    return this.conversationRepository.findBySessionId(sessionId);
  }

  /**
   * Get user's conversation history
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepository.findByUserId(userId);
  }

  /**
   * Get formatted user chat history with character names
   */
  async getUserHistory(userId: string): Promise<GetHistoryResponseDto> {
    const conversations = await this.getUserConversations(userId);

    // Fetch character names for all conversations
    const characterIds = [...new Set(conversations.map((c) => c.characterId))];
    const characterMap = new Map<string, string>();

    await Promise.all(
      characterIds.map(async (id) => {
        const character = await this.characterService.getCharacterById(id);
        if (character) {
          characterMap.set(id, character.name);
        }
      }),
    );

    const history: CharacterHistoryDto[] = conversations.map((conv) => ({
      characterId: conv.characterId,
      characterName: characterMap.get(conv.characterId) || conv.characterId,
      lastMessage: conv.messages[conv.messages.length - 1]?.content || '',
      sessionId: conv.sessionId,
      showSlug: conv.showSlug,
      updatedAt: conv.updatedAt || conv.createdAt || new Date(),
    }));

    return {
      conversations: history,
    };
  }

  /**
   * Send chat message and get LLM response
   * Handles character validation, session management, LLM interaction
   */
  async sendChatMessage(
    userId: string,
    body: ChatMessageRequestDto,
    lang: string,
    platform: string,
    sessionService: SessionService,
  ): Promise<ChatMessageResponseDto> {
    // Validate character exists
    const character = await this.characterService.getCharacterById(
      body.character,
    );
    if (!character) {
      throw Errors.CONTENT.NO_CONTENT_FOUND('Character not found');
    }

    // Get or create session
    let session: ChatSession | null = null;

    if (body.sessionId) {
      session = await sessionService.getSession(body.sessionId);
    }

    if (!session) {
      // Create new session if not exists
      const sessionId = sessionService.generateSessionId();
      session = {
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
    }

    // Add user message
    session.messages.push({
      content: body.message,
      role: 'user',
      timestamp: new Date(),
    });

    // Get LLM response (non-streaming)
    const assistantResponse = await this.llmService.getChatCompletion(
      session.messages,
    );

    // Add assistant response
    session.messages.push({
      content: assistantResponse,
      role: 'assistant',
      timestamp: new Date(),
    });

    // Update session
    await sessionService.saveSession(session);
    await this.syncSession(session);

    this.logger.log(`Processed message for session ${session.id}`);

    return {
      character: {
        avatar: character.avatar,
        greeting: character.greeting,
        id: character.slug,
        name: character.name,
      },
      message: assistantResponse,
      sessionId: session.id,
    };
  }

  /**
   * Stream chat message via SSE
   * Handles session validation, authorization, LLM streaming, and persistence
   */
  streamChatMessage(
    userId: string,
    sessionId: string,
    message: string,
    sessionService: SessionService,
  ): Observable<MessageEvent> {
    return new Observable((observer) => {
      this.handleStreamMessage(
        userId,
        sessionId,
        message,
        sessionService,
        observer,
      ).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.logger.error(
          `SSE stream error - Session: ${sessionId}, Error: ${errorMessage}`,
          errorStack,
        );

        observer.next({
          data: {
            done: true,
            error: errorMessage,
            token: '',
          },
        } as MessageEvent);

        observer.error(error);
      });
    });
  }

  /**
   * Sync session from Redis to MongoDB
   */
  async syncSession(session: ChatSession): Promise<void> {
    const existing = await this.getConversation(session.id);

    if (!existing) {
      // Create new conversation
      await this.createConversation(session);
    } else {
      // Update existing with latest messages
      const existingMessageCount = existing.messages.length;
      const newMessages = session.messages.slice(existingMessageCount);

      for (const msg of newMessages) {
        await this.addMessage(session.id, msg);
      }
    }
  }
}
