import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { ErrorHandlerService, Errors } from '@app/error-handler';
import { APP_CONFIGS } from 'common/configs/app.config';
import {
  GeminiContentPart,
  GeminiImageGenerationRequest,
  GeminiImageGenerationResponse,
  GenerateImageParams,
} from 'common/interfaces/ai.interface';

@Injectable()
export class GoogleAIService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.apiKey = APP_CONFIGS.GOOGLE_AI.API_KEY || '';
    this.baseUrl = APP_CONFIGS.GOOGLE_AI.BASE_URL;
    this.defaultModel = APP_CONFIGS.GOOGLE_AI.DEFAULT_MODEL;
  }

  private combinePrompts(prompts: string[]): string {
    if (prompts.length === 1) {
      return prompts[0];
    }
    return `${prompts[0]}\n\nIMPORTANT: Multiple reference images have been provided. Use ALL reference images to maintain character consistency and accuracy.`;
  }

  private extractImageFromGeminiResponse(
    response: GeminiImageGenerationResponse,
  ): string | null {
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data,
    );
    return imagePart?.inlineData?.data ?? null;
  }

  async generateImage({
    aspectRatio = '2:3',
    images,
    model,
    prompts,
  }: GenerateImageParams): Promise<Buffer> {
    const selectedModel = model || this.defaultModel;

    // Build contents array with text and image
    const combinedPrompt = this.combinePrompts(prompts);
    const contents: GeminiContentPart[] = [{ text: combinedPrompt }];

    const maxImages = Math.min(images.length, 14);
    for (let i = 0; i < maxImages; i++) {
      contents.push({
        inlineData: {
          data: images[i].toString('base64'),
          mimeType: 'image/png',
        },
      });
    }

    const requestBody: GeminiImageGenerationRequest = {
      contents: [{ parts: contents }],
      generationConfig: {
        imageConfig: {
          aspectRatio,
          imageSize: '2K',
        },
        responseModalities: ['IMAGE', 'TEXT'],
      },
    };

    const requestUrl = `${this.baseUrl}/v1beta/models/${selectedModel}:generateContent?key=${this.apiKey}`;

    const [response, error] = await this.errorHandler.try(async () =>
      firstValueFrom(
        this.httpService.post(requestUrl, requestBody, {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    if (error || !response) {
      throw Errors.CMS.IMAGE_GENERATION.GENERATION_FAILED(
        error instanceof Error ? error.message : 'Image generation failed',
      );
    }

    const generatedImageData = this.extractImageFromGeminiResponse(
      response.data,
    );

    if (!generatedImageData) {
      throw Errors.CMS.IMAGE_GENERATION.NO_IMAGE_DATA_FOUND(
        `Unsupported image/prompt : ${response.data.candidates?.[0]?.finishMessage}`,
      );
    }

    return Buffer.from(generatedImageData, 'base64');
  }
}
