import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import sharp from 'sharp';

import { AiService } from './ai.service';
import { Errors } from '@app/error-handler';
import { S3Service } from '@app/storage';
import { APP_CONFIGS } from 'common/configs/app.config';
import { SUPPORTED_GEMINI_ASPECT_RATIOS } from 'common/constants/app.constant';
import {
  enhancePromptForBaseImage,
  enhancePromptForRatioAdjustment,
} from 'common/helpers/prompt.helper';
import {
  GenerateAiImageFromS3UrlsParams,
  GeminiAspectRatio,
} from 'common/interfaces/ai.interface';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

const IMAGE_CONFIG = {
  MAX_IMAGE_SIZE_MB: 10,
  MAX_IMAGES: 10,
  MAX_TOTAL_SIZE_MB: 50,
} as const;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const getAspectRatioString = (width: number, height: number): string => {
  const divisor = gcd(width, height);
  return `${width / divisor}x${height / divisor}`;
};

const parseRatioToValue = (ratio: GeminiAspectRatio): number => {
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
};

const findClosestGeminiRatio = (
  width: number,
  height: number,
): GeminiAspectRatio => {
  const targetRatio = width / height;
  const ratios = Array.from(SUPPORTED_GEMINI_ASPECT_RATIOS);

  let closest = ratios[0];
  let minDiff = Math.abs(targetRatio - parseRatioToValue(closest));

  for (const ratio of ratios) {
    const diff = Math.abs(targetRatio - parseRatioToValue(ratio));
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }

  return closest;
};

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly s3Service: S3Service,
    private readonly aiService: AiService,
  ) {}

  private buildS3ImageUrl(bucket: string, filePath: string): string {
    const region = APP_CONFIGS.AWS.S3.REGION;
    return `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  }

  private async downloadImageBuffers(imageUrls: string[]): Promise<Buffer[]> {
    return Promise.all(
      imageUrls.map((url) => this.s3Service.downloadImageAsBuffer(url)),
    );
  }

  private filterSupportedRatios(
    ratios: GeminiAspectRatio[],
  ): GeminiAspectRatio[] {
    const supported = ratios.filter((ratio) => {
      if (!SUPPORTED_GEMINI_ASPECT_RATIOS.has(ratio)) {
        this.logger.warn(
          `Ratio ${ratio} is not supported by Gemini API and will be skipped.`,
        );
        return false;
      }
      return true;
    });

    if (supported.length === 0) {
      throw Errors.CMS.IMAGE_GENERATION.UNSUPPORTED_ASPECT_RATIOS(
        'None of the requested ratios are supported by Gemini API',
      );
    }

    return supported;
  }

  private async generateAndUploadAdjustedImageJpeg({
    aspectRatio,
    baseFileName,
    baseImageReferenceBuffer,
    model,
    projectId,
    promptId,
    prompts,
  }: {
    aspectRatio: GeminiAspectRatio;
    baseFileName: string;
    baseImageReferenceBuffer: Buffer;
    model?: string;
    projectId: string;
    prompts: string[];
    promptId: string;
  }): Promise<string> {
    const sanitizedRatio = aspectRatio.replace(':', 'x');
    const ratioFileName = `${baseFileName}-${sanitizedRatio}.jpg`;

    const adjustmentPrompts = prompts.map((prompt) =>
      enhancePromptForRatioAdjustment(prompt, aspectRatio),
    );

    const adjustedImageBuffer = await this.aiService.generateImage({
      aspectRatio,
      images: [baseImageReferenceBuffer],
      model,
      prompts: adjustmentPrompts,
    });

    const jpegBuffer = await sharp(adjustedImageBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    const { bucket, filePath } = MediaFilePathUtils.generatePosterImageFilePath(
      {
        fileName: ratioFileName,
        projectId,
        promptId,
      },
    );

    await this.s3Service.uploadFileBuffer({
      bucket,
      buffer: jpegBuffer,
      filePath,
      mimeType: 'image/jpeg',
    });

    return this.buildS3ImageUrl(bucket, filePath);
  }

  private async generateAndUploadAdjustedImagesJpeg({
    baseFileName,
    baseImageUrl,
    model,
    otherRatios,
    projectId,
    promptId,
    prompts,
  }: {
    baseImageUrl: string;
    baseFileName: string;
    model?: string;
    otherRatios: GeminiAspectRatio[];
    projectId: string;
    prompts: string[];
    promptId: string;
  }): Promise<Record<string, string>> {
    const baseImageReferenceBuffer =
      await this.s3Service.downloadImageAsBuffer(baseImageUrl);

    if (!baseImageReferenceBuffer || baseImageReferenceBuffer.length === 0) {
      throw Errors.CMS.IMAGE_GENERATION.BASE_IMAGE_DOWNLOAD_FAILED(
        'Failed to download base image for adjustments',
      );
    }

    const adjustmentPromises = otherRatios.map(async (ratio) => {
      const adjustedImageUrl = await this.generateAndUploadAdjustedImageJpeg({
        aspectRatio: ratio,
        baseFileName,
        baseImageReferenceBuffer,
        model,
        projectId,
        promptId,
        prompts,
      });

      return { imageUrl: adjustedImageUrl, ratio };
    });

    const adjustmentResults = await Promise.all(adjustmentPromises);
    const generatedImages: Record<string, string> = {};

    for (const { imageUrl, ratio } of adjustmentResults) {
      generatedImages[ratio] = imageUrl;
    }

    return generatedImages;
  }

  private async generateAndUploadBaseImageJpeg({
    aspectRatio,
    baseFileName,
    imageBuffers,
    model,
    projectId,
    promptId,
    prompts,
  }: {
    aspectRatio: GeminiAspectRatio;
    baseFileName: string;
    imageBuffers: Buffer[];
    model?: string;
    projectId: string;
    prompts: string[];
    promptId: string;
  }): Promise<string> {
    const basePrompts = prompts.map((prompt) =>
      enhancePromptForBaseImage(prompt),
    );

    const baseImageBuffer = await this.aiService.generateImage({
      aspectRatio,
      images: imageBuffers,
      model,
      prompts: basePrompts,
    });

    const jpegBuffer = await sharp(baseImageBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    const sanitizedRatio = aspectRatio.replace(':', 'x');
    const fileName = `${baseFileName}-${sanitizedRatio}.jpg`;
    const { bucket, filePath } = MediaFilePathUtils.generatePosterImageFilePath(
      {
        fileName,
        projectId,
        promptId,
      },
    );

    await this.s3Service.uploadFileBuffer({
      bucket,
      buffer: jpegBuffer,
      filePath,
      mimeType: 'image/jpeg',
    });

    return this.buildS3ImageUrl(bucket, filePath);
  }

  private prepareBaseFileName(outputFileName?: string): string {
    if (outputFileName) {
      return outputFileName.replace(/\.(webp|jpg|jpeg|png)$/, '');
    }
    return `ai-poster-${new Date().getTime()}`;
  }

  private async processResize({
    baseFileName,
    customPrompt,
    height,
    projectId,
    promptId,
    sourceBuffer,
    width,
  }: {
    baseFileName: string;
    customPrompt?: string;
    height: number;
    projectId: string;
    promptId: string;
    sourceBuffer: Buffer;
    width: number;
  }): Promise<{ height: number; url: string; width: number }> {
    const geminiRatio = findClosestGeminiRatio(width, height);

    const basePrompt =
      customPrompt ||
      'Adapt this poster to the new aspect ratio while maintaining all visual elements.';
    const adjustmentPrompt = enhancePromptForRatioAdjustment(
      basePrompt,
      geminiRatio,
    );

    const aiGeneratedBuffer = await this.aiService.generateImage({
      aspectRatio: geminiRatio,
      images: [sourceBuffer],
      prompts: [adjustmentPrompt],
    });

    const finalBuffer = await sharp(aiGeneratedBuffer)
      .resize({
        fit: 'cover',
        height,
        position: 'center',
        width,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    const aspectRatioStr = getAspectRatioString(width, height);
    const fileName = `${baseFileName}_${aspectRatioStr}.jpg`;

    const { bucket, filePath } = MediaFilePathUtils.generatePosterImageFilePath(
      {
        fileName,
        projectId,
        promptId,
      },
    );

    await this.s3Service.uploadFileBuffer({
      bucket,
      buffer: finalBuffer,
      filePath,
      mimeType: 'image/jpeg',
    });

    return {
      height,
      url: this.buildS3ImageUrl(bucket, filePath),
      width,
    };
  }

  private validateImageInputs(imageUrls: string[]): void {
    if (imageUrls.length > IMAGE_CONFIG.MAX_IMAGES || imageUrls.length === 0) {
      throw Errors.CMS.IMAGE_GENERATION.NO_IMAGES_PROVIDED(
        `Expected 1-${IMAGE_CONFIG.MAX_IMAGES} images, got ${imageUrls.length}`,
      );
    }
  }

  async generatePosterImagesForProject({
    imageUrls,
    model,
    outputFileName,
    projectId,
    promptId,
    prompts,
    ratios,
  }: GenerateAiImageFromS3UrlsParams & {
    projectId: string;
    promptId: string;
  }): Promise<Partial<Record<GeminiAspectRatio, string>>> {
    this.validateImageInputs(imageUrls);

    const imageBuffers = await this.downloadImageBuffers(imageUrls);
    const supportedRatios = this.filterSupportedRatios(ratios ?? ['2:3']);
    const baseFileName = this.prepareBaseFileName(outputFileName);

    const primaryRatio = supportedRatios[0];
    const baseImageUrl = await this.generateAndUploadBaseImageJpeg({
      aspectRatio: primaryRatio,
      baseFileName,
      imageBuffers,
      model,
      projectId,
      promptId,
      prompts,
    });

    const generatedImages: Record<string, string> = {
      [primaryRatio]: baseImageUrl,
    };

    const otherRatios = supportedRatios.filter((r) => r !== primaryRatio);
    if (otherRatios.length > 0) {
      const adjustedImages = await this.generateAndUploadAdjustedImagesJpeg({
        baseFileName,
        baseImageUrl,
        model,
        otherRatios,
        projectId,
        promptId,
        prompts,
      });

      Object.assign(generatedImages, adjustedImages);
    }

    return generatedImages;
  }

  async resizePosterToSizes({
    customPrompt,
    projectId,
    promptId,
    sizes,
    sourceUrl,
  }: {
    customPrompt?: string;
    projectId: string;
    promptId: string;
    sizes: { height: number; width: number }[];
    sourceUrl: string;
  }): Promise<{ height: number; url: string; width: number }[]> {
    const sourceBuffer = await this.s3Service.downloadImageAsBuffer(sourceUrl);

    if (!sourceBuffer || sourceBuffer.length === 0) {
      throw Errors.CMS.IMAGE_GENERATION.BASE_IMAGE_DOWNLOAD_FAILED(
        'Failed to download source image for resizing',
      );
    }

    if (sourceBuffer.length > IMAGE_CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      throw Errors.CMS.IMAGE_GENERATION.BASE_IMAGE_DOWNLOAD_FAILED(
        `Image too large. Maximum size is ${IMAGE_CONFIG.MAX_IMAGE_SIZE_MB}MB`,
      );
    }

    const urlParts = sourceUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1];
    const baseFileName = originalFileName.replace(
      /\.(webp|jpg|jpeg|png)$/i,
      '',
    );

    const BATCH_SIZE = 2;
    const results: { height: number; url: string; width: number }[] = [];

    for (let i = 0; i < sizes.length; i += BATCH_SIZE) {
      const batch = sizes.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(({ height, width }) =>
          this.processResize({
            baseFileName,
            customPrompt,
            height,
            projectId,
            promptId,
            sourceBuffer,
            width,
          }),
        ),
      );

      results.push(...batchResults);
    }

    return results;
  }

  async transformImage({
    source,
    width,
  }: {
    source: string;
    width: number;
  }): Promise<ArrayBuffer> {
    const response = await firstValueFrom(
      this.httpService.get<ArrayBuffer>(source, {
        responseType: 'arraybuffer',
      }),
    );

    const inputBuffer = Buffer.from(response.data);

    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();

    const result = new ArrayBuffer(outputBuffer.length);
    new Uint8Array(result).set(outputBuffer);
    return result;
  }
}
