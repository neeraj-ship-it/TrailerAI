import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';

/**
 * Message subdocument schema
 * Embedded in Conversation documents
 */
@Schema({ _id: false, timestamps: false })
export class Message {
  /** Message text content */
  @Prop({ required: true })
  content!: string;

  /** Message sender role */
  @Prop({ enum: ['system', 'user', 'assistant'], required: true })
  role!: string;

  /** Message creation timestamp */
  @Prop({ default: Date.now, type: Date })
  timestamp!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

/**
 * Conversation document schema
 * Stores persistent chat history in MongoDB
 *
 * Collection: conversations
 * Indexes:
 * - sessionId (unique) - for session lookup
 * - userId + characterId (compound) - for user history per character
 * - showSlug - for show-based queries
 * - createdAt (desc) - for recent conversations
 */
@Schema({ collection: 'conversations', timestamps: true })
export class Conversation extends BaseModel {
  /** Character slug identifier */
  @Prop({ index: true, name: 'character_id', required: true })
  characterId!: string;

  /** Character's dialect for context */
  @Prop({ required: true })
  dialect!: string;

  /** Array of conversation messages */
  @Prop({ default: [], type: [MessageSchema] })
  messages!: Message[];

  /** Unique session identifier (from Redis) */
  @Prop({ index: true, name: 'session_id', required: true, unique: true })
  sessionId!: string;

  /** Show slug for grouping conversations */
  @Prop({ index: true, name: 'show_slug', required: true })
  showSlug!: string;

  /** User ID who owns this conversation */
  @Prop({ index: true, name: 'user_id', required: true })
  userId!: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Performance indexes (using database field names)
ConversationSchema.index({ sessionId: 1 }, { unique: true }); // Primary lookup
ConversationSchema.index({ characterId: 1, userId: 1 }); // User history per character
ConversationSchema.index({ showSlug: 1 }); // Show-based queries
ConversationSchema.index({ createdAt: -1 }); // Recent conversations first
ConversationSchema.index({ updatedAt: -1, userId: 1 }); // User's recent chats
