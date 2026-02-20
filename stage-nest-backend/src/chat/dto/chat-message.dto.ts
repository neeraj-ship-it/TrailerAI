/**
 * Character information returned in responses
 */
export interface CharacterInfoDto {
  /** Avatar URL */
  avatar: string;
  /** Character slug identifier */
  id: string;
  /** Character display name */
  name: string;
}

/**
 * Extended character info with greeting
 */
export interface CharacterWithGreetingDto extends CharacterInfoDto {
  /** Initial greeting message */
  greeting: string;
}

/**
 * Request to send a chat message
 */
export interface ChatMessageRequestDto {
  /** Character slug identifier */
  character: string;
  /** User's message content */
  message: string;
  /** Optional session ID for continuing conversation */
  sessionId?: string;
}

/**
 * Request to create a new chat session
 */
export interface CreateSessionRequestDto {
  /** Character slug identifier */
  character: string;
}

/**
 * Response with chat message from character
 */
export interface ChatMessageResponseDto {
  /** Character information */
  character: CharacterWithGreetingDto;
  /** Assistant's response message (optional for streaming) */
  message?: string;
  /** Session identifier */
  sessionId: string;
}

/**
 * Response after creating a new session
 */
export interface CreateSessionResponseDto {
  /** Character information */
  character: CharacterInfoDto;
  /** Initial greeting message */
  greeting: string;
  /** New session identifier */
  sessionId: string;
}
