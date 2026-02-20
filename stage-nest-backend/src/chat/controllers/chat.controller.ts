import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, Logger, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { type Context, type ContextUser, Ctx, CtxUser } from '@app/auth';
import { Errors } from '@app/error-handler';

import { WEB_CONSTANTS } from 'common/constants/web.constants';
import { DialectName, Lang } from 'common/enums/app.enum';
import { ContentType } from 'common/enums/common.enums';

import {
  type ChatMessageRequestDto,
  type ChatMessageResponseDto,
  type CreateSessionRequestDto,
  type CreateSessionResponseDto,
} from '../dto/chat-message.dto';
import { type ChatSession } from '../interfaces/character.interface';
import { ConversationService } from '../services/conversation.service';
import { SessionService } from '../services/session.service';

@Controller()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Create new chat session
   */
  @TypedRoute.Post('session')
  async createSession(
    @CtxUser() ctxUser: ContextUser,
    @Ctx() ctx: Context,
    @TypedBody() body: CreateSessionRequestDto,
  ): Promise<CreateSessionResponseDto> {
    return this.sessionService.createChatSession(
      ctxUser.id,
      body,
      ctx.meta.lang,
      ctx.meta.platform,
    );
  }

  /**
   * Get bot redirect URL for character chat
   * Constructs URL: https://stage.in/{lang}/{dialectName}/{contentType}/{slug}/characters
   */
  @TypedRoute.Get('bot-redirect')
  getBotRedirect(
    @Ctx() ctx: Context,
    @TypedQuery() query: { contentType: ContentType; slug: string },
  ): { redirectUrl: string } {
    const dialectName =
      DialectName[ctx.meta.dialect as keyof typeof DialectName] ||
      ctx.meta.dialect;

    let newLang: string;
    let newContentType: string;
    if (ctx.meta.lang === Lang.HIN) {
      newLang = 'hi';
    } else {
      newLang = Lang.EN;
    }

    if (query.contentType === ContentType.MOVIE) {
      newContentType = 'movie';
    } else {
      newContentType = 'show';
    }

    const redirectUrl = `${WEB_CONSTANTS.baseUrl}/${newLang}/${dialectName}/${newContentType}/${query.slug}/characters`;

    return { redirectUrl };
  }

  async getSession(
    @CtxUser() ctxUser: ContextUser,
    @TypedParam('id') sessionId: string,
  ): Promise<ChatSession> {
    const session = await this.sessionService.getSession(sessionId);

    if (!session) {
      throw Errors.CONTENT.NO_CONTENT_FOUND('Session not found');
    }

    // Verify session belongs to user
    if (session.userId !== ctxUser.id) {
      throw Errors.USER.USER_NOT_FOUND('Unauthorized access');
    }

    return session;
  }

  /**
   * Send message and get LLM response (non-streaming)
   */
  @TypedRoute.Post('chat')
  async sendMessage(
    @CtxUser() ctxUser: ContextUser,
    @Ctx() ctx: Context,
    @TypedBody() body: ChatMessageRequestDto,
  ): Promise<ChatMessageResponseDto> {
    return this.conversationService.sendChatMessage(
      ctxUser.id,
      body,
      ctx.meta.lang,
      ctx.meta.platform,
      this.sessionService,
    );
  }

  /**
   * Stream chat message via Server-Sent Events (SSE)
   * URL: /api/chat/stream?sessionId=xxx&message=yyy
   *
   * Response format:
   * data: {"token":"Ram","done":false}
   * data: {"token":" ram","done":false}
   * data: {"token":"","done":true,"sessionId":"uuid"}
   */
  @Sse('stream')
  streamMessage(
    @CtxUser() ctxUser: ContextUser,
    @TypedQuery() query: { sessionId: string; message: string },
  ): Observable<MessageEvent> {
    this.logger.log(
      `SSE stream requested - Session: ${query.sessionId}, User: ${ctxUser.id}`,
    );

    return this.conversationService.streamChatMessage(
      ctxUser.id,
      query.sessionId,
      query.message,
      this.sessionService,
    );
  }
}
