import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { BaseModel } from 'common/entities/base.entity';

/**
 * Character entity
 * Represents an AI chatbot character from a show
 *
 * Collection: characters
 * Indexes:
 * - slug (unique) - primary identifier
 * - isActive + showSlug (compound) - for fetching active characters by show
 * - isActive + order (compound) - for ordered character lists
 */
@Schema({ collection: 'characters', timestamps: true })
export class Character extends BaseModel {
  /** Avatar image URL */
  @Prop({ required: true })
  avatar!: string;

  /** Character's actual name from the show */
  @Prop({ required: true })
  characterName!: string;

  /** Dialect code (e.g., 'bho' for Bhojpuri, 'har' for Haryanvi) */
  @Prop({ required: true })
  dialect!: string;

  /** Initial greeting message shown to users */
  @Prop({ required: true })
  greeting!: string;

  /** Whether this character is currently available for chat */
  @Prop({ default: true, index: true, required: true })
  isActive!: boolean;

  /** Display name for UI (may differ from characterName) */
  @Prop({ required: true })
  name!: string;

  /** Display order in character lists (lower number = appears first) */
  @Prop({ default: 0, required: true })
  order!: number;

  /** Denormalized show title for display */
  @Prop({ required: true })
  show!: string;

  /** Show slug linking to show collection */
  @Prop({ index: true, required: true })
  showSlug!: string;

  /** Unique character identifier (slug) */
  @Prop({ required: true })
  slug!: string;

  /** Complete system prompt with personality and LLM instructions */
  @Prop({ required: true, type: String })
  systemPrompt!: string;

  // Inherited from BaseModel:
  // - createdAt: Date
  // - updatedAt: Date
}

export const CharacterSchema = SchemaFactory.createForClass(Character);

// Performance indexes
CharacterSchema.index({ isActive: 1, showSlug: 1 }); // Active characters by show
CharacterSchema.index({ isActive: 1, order: 1 }); // Ordered active characters list
