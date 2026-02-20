/**
 * Chat Module Constants
 * Centralized configuration values for the chat feature
 */

/**
 * Redis session configuration
 */
export const REDIS_SESSION = {
  /** Redis key prefix for chat sessions */
  PREFIX: 'chat:session:',
  /** Session TTL in seconds (24 hours) */
  TTL: 86400,
} as const;

/**
 * Conversation limits
 */
export const CONVERSATION_LIMITS = {
  /** Maximum conversations to return in history */
  MAX_HISTORY_RESULTS: 50,
  /** Maximum messages per conversation (for memory management) */
  MAX_MESSAGES_PER_CONVERSATION: 1000,
} as const;

/**
 * LLM configuration defaults
 */
export const LLM_DEFAULTS = {
  /** Default max tokens per response */
  MAX_TOKENS: 150,
  /** Default model to use */
  MODEL: 'grok-3-latest',
  /** Default temperature for responses */
  TEMPERATURE: 0.8,
} as const;

/**
 * Message roles
 */
export const MESSAGE_ROLES = {
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  USER: 'user',
} as const;

/**
 * SSE (Server-Sent Events) response types
 */
export const SSE_EVENTS = {
  /** Stream completed successfully */
  COMPLETE: { done: true },
  /** Stream encountered an error */
  ERROR: (message: string) => ({ done: true, error: message, token: '' }),
  /** Streaming in progress */
  STREAMING: { done: false },
} as const;
