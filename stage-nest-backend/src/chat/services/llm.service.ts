/**
 * LLM Service
 * Handles integration with Grok API (xAI) for character chat responses
 *
 * Features:
 * - Streaming and non-streaming completions
 * - Configurable model parameters
 * - Comprehensive error handling and logging
 * - Matches characterbots configuration for consistency
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { LLM_DEFAULTS } from '../constants/chat.constants';
import { type ChatMessage } from '../interfaces/character.interface';

@Injectable()
export class LLMService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(LLMService.name);
  private readonly maxTokens: number;
  private readonly model: string;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('XAI_API_KEY');

    if (!apiKey) {
      this.logger.error('XAI_API_KEY is not configured');
      throw new Error('XAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });

    // Model configuration (matching characterbots defaults)
    this.model = this.configService.get<string>(
      'LLM_MODEL',
      LLM_DEFAULTS.MODEL,
    );
    this.temperature = this.configService.get<number>(
      'LLM_TEMPERATURE',
      LLM_DEFAULTS.TEMPERATURE,
    );
    this.maxTokens = this.configService.get<number>(
      'LLM_MAX_TOKENS',
      LLM_DEFAULTS.MAX_TOKENS,
    );

    this.logger.log(
      `LLM Service initialized - Model: ${this.model}, Temp: ${this.temperature}, MaxTokens: ${this.maxTokens}`,
    );
  }

  /**
   * Get non-streaming chat completion from Grok (fallback)
   */
  async getChatCompletion(messages: ChatMessage[]): Promise<string> {
    try {
      this.logger.debug(
        `Non-streaming completion with ${messages.length} messages`,
      );

      const response = await this.client.chat.completions.create({
        max_tokens: this.maxTokens,
        messages: messages.map((msg) => ({
          content: msg.content,
          role: msg.role,
        })),
        model: this.model,
        temperature: this.temperature,
      });

      const content = response.choices[0]?.message?.content || '';
      this.logger.debug(`Non-streaming completion: ${content.length} chars`);

      return content;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Grok API error (non-streaming): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Stream chat completion from Grok API
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
  ): AsyncGenerator<string, void, unknown> {
    try {
      this.logger.debug(
        `Starting stream with ${messages.length} messages to Grok`,
      );

      const stream = await this.client.chat.completions.create({
        max_tokens: this.maxTokens,
        messages: messages.map((msg) => ({
          content: msg.content,
          role: msg.role,
        })),
        model: this.model,
        stream: true,
        temperature: this.temperature,
      });

      let tokenCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          tokenCount++;
          yield content;
        }
      }

      this.logger.debug(`Stream completed. Total tokens: ${tokenCount}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Grok API stream error: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
