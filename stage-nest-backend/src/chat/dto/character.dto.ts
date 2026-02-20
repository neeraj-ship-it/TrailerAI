/**
 * Character display information
 */
export interface CharacterDto {
  /** Avatar URL */
  avatar: string;
  /** Character's dialect (e.g., 'bho', 'har', 'hin') */
  dialect: string;
  /** Character slug identifier */
  id: string;
  /** Character display name */
  name: string;
}

/**
 * Show information
 */
export interface ShowInfoDto {
  /** Primary dialect of the show */
  dialect: string;
  /** Show slug identifier */
  slug: string;
  /** Show title */
  title: string;
}

/**
 * Response with all characters for a series/show
 */
export interface SeriesCharactersResponseDto {
  /** List of characters in the show */
  characters: CharacterDto[];
  /** Show information */
  show: ShowInfoDto;
}

/**
 * Single conversation history entry
 */
export interface CharacterHistoryDto {
  /** Character slug identifier */
  characterId: string;
  /** Character display name */
  characterName: string;
  /** Last message in the conversation */
  lastMessage: string;
  /** Session identifier */
  sessionId: string;
  /** Show slug identifier */
  showSlug: string;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * User's chat history response
 */
export interface GetHistoryResponseDto {
  /** List of conversation history entries */
  conversations: CharacterHistoryDto[];
}
