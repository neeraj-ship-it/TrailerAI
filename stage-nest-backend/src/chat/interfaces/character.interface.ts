/**
 * Character entity interface
 * Represents a chatbot character linked to a show
 */
export interface Character {
  /** Avatar URL (e.g., '/avatars/sanwri.svg') */
  avatar: string;
  /** Character's actual name from show (e.g., 'Sanwri') */
  characterName: string;
  /** Character's dialect code (e.g., 'bho', 'har', 'hin') */
  dialect: string;
  /** Initial greeting message shown to user */
  greeting: string;
  /** Whether character is available for chat */
  isActive: boolean;
  /** Display name for UI */
  name: string;
  /** Display order in character list (lower = first) */
  order: number;
  /** Show title for display */
  show: string;
  /** Show slug identifier for linking to show collection */
  showSlug: string;
  /** Unique identifier (slug) for the character */
  slug: string;
  /** System prompt with LLM instructions and character personality */
  systemPrompt: string;
}

/**
 * Message role types for chat
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Single message in a chat conversation
 */
export interface ChatMessage {
  /** Message content/text */
  content: string;
  /** Who sent the message */
  role: MessageRole;
  /** When the message was created */
  timestamp?: Date;
}

/**
 * Active chat session stored in Redis and MongoDB
 */
export interface ChatSession {
  /** Character slug identifier */
  characterId: string;
  /** When session was created */
  createdAt: Date;
  /** Character's dialect for context */
  dialect: string;
  /** Session UUID */
  id: string;
  /** User's preferred language (e.g., 'en', 'hi') */
  lang: string;
  /** Conversation history (system prompt + messages) */
  messages: ChatMessage[];
  /** Platform user is chatting from */
  platform: string;
  /** Show slug for context */
  showSlug: string;
  /** Last update timestamp */
  updatedAt?: Date;
  /** User ID from JWT */
  userId: string;
}

export interface SeriesInfo {
  /** Number of characters in the show */
  characterCount: number;
  /** Show description */
  description?: string;
  /** Primary dialect of the show */
  dialect: string;
  /** Show identifier */
  id: string;
  /** Show title */
  name: string;
  /** Show slug */
  slug: string;
  /** Thumbnail URL */
  thumbnail?: string;
}
