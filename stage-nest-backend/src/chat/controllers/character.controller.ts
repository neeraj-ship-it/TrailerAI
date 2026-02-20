import { TypedParam, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { type ContextUser, CtxUser, Public } from '@app/auth';

import {
  type GetHistoryResponseDto,
  type SeriesCharactersResponseDto,
} from '../dto/character.dto';
import { CharacterService } from '../services/character.service';
import { ConversationService } from '../services/conversation.service';

@Controller()
export class CharacterController {
  constructor(
    private readonly characterService: CharacterService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Get a single character by ID/slug
   * Used for chat page initialization
   */
  @Public()
  @TypedRoute.Get('characters/:id')
  async getCharacter(@TypedParam('id') id: string) {
    return this.characterService.getCharacterDetails(id);
  }

  /**
   * Get user's chat history with all characters
   */
  @TypedRoute.Get('history')
  async getHistory(
    @CtxUser() ctxUser: ContextUser,
  ): Promise<GetHistoryResponseDto> {
    return this.conversationService.getUserHistory(ctxUser.id);
  }

  /**
   * Get all characters for a specific show
   * PRIMARY ENDPOINT - Entry point from show detail page
   */
  @Public()
  @TypedRoute.Get('series/:slug/characters')
  async getSeriesCharacters(
    @TypedParam('slug') slug: string,
  ): Promise<SeriesCharactersResponseDto> {
    return this.characterService.getSeriesCharactersFormatted(slug);
  }
}
