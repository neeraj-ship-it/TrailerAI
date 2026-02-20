import { Injectable } from '@nestjs/common';

import { Errors } from '@app/error-handler';

import { type SeriesCharactersResponseDto } from '../dto/character.dto';
import { Character } from '../entities/character.entity';
import { CharacterRepository } from '../repositories/character.repository';

@Injectable()
export class CharacterService {
  constructor(private readonly characterRepository: CharacterRepository) {}

  /**
   * Check if character exists (async from MongoDB)
   */
  async characterExists(characterId: string): Promise<boolean> {
    return this.characterRepository.existsAndActive(characterId);
  }

  /**
   * Get all available characters (async from MongoDB)
   */
  async getAllCharacters(): Promise<Character[]> {
    return this.characterRepository.findAllActive();
  }

  /**
   * Get character by ID (async from MongoDB)
   */
  async getCharacterById(characterId: string): Promise<Character | null> {
    return this.characterRepository.findByCharacterId(characterId);
  }

  /**
   * Get character details with validation and response formatting
   */
  async getCharacterDetails(id: string) {
    const character = await this.getCharacterById(id);

    if (!character) {
      throw Errors.CONTENT.NO_CONTENT_FOUND('Character not found');
    }

    return {
      character: {
        avatar: character.avatar,
        characterName: character.characterName,
        dialect: character.dialect,
        greeting: character.greeting,
        id: character.slug,
        isActive: character.isActive,
        name: character.name,
        order: character.order,
        show: character.show,
        showSlug: character.showSlug,
        systemPrompt: character.systemPrompt,
      },
    };
  }

  /**
   * Get all characters for a specific show (async from MongoDB)
   */
  async getCharactersByShow(showSlug: string): Promise<Character[]> {
    return this.characterRepository.findActiveByShowSlug(showSlug);
  }

  /**
   * Get all characters for a show with formatted response
   */
  async getSeriesCharactersFormatted(
    slug: string,
  ): Promise<SeriesCharactersResponseDto> {
    const characters = await this.getCharactersByShow(slug);

    // Use first character's metadata for show info
    const showTitle = characters[0]?.show;
    const dialect = characters[0]?.dialect;

    return {
      characters: characters.map((char) => ({
        avatar: char.avatar,
        dialect: char.dialect,
        id: char.slug,
        name: char.name,
      })),
      show: {
        dialect,
        slug,
        title: showTitle,
      },
    };
  }
}
