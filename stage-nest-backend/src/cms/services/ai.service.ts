import { Injectable, Logger } from '@nestjs/common';

import { GoogleAIService } from './google-ai.service';
import { ErrorHandlerService } from '@app/error-handler';
import { APP_CONFIGS } from 'common/configs/app.config';
import { GenerateImageParams } from 'common/interfaces/ai.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly retryConfig = APP_CONFIGS.GOOGLE_AI.RETRY;

  constructor(
    private readonly googleAIService: GoogleAIService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async generateImage(params: GenerateImageParams): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.MAX_RETRIES; attempt++) {
      const [result, error] = await this.errorHandler.try(() =>
        this.googleAIService.generateImage(params),
      );

      if (result && !error) {
        return result;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      this.logger.warn({ error: lastError }, 'Image generation failed');
      if (attempt < this.retryConfig.MAX_RETRIES) {
        // Exponential backoff with jitter: min((2^n + random_fraction), maximum_backoff)
        const exponentialDelay =
          this.retryConfig.BASE_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.random() * this.retryConfig.JITTER_MAX_MS;
        const delayMs = Math.min(
          exponentialDelay + jitter,
          this.retryConfig.MAX_DELAY_MS,
        );

        this.logger.warn(
          `Image generation failed (attempt ${attempt + 1}/${this.retryConfig.MAX_RETRIES + 1}), retrying in ${Math.round(delayMs)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }
}
