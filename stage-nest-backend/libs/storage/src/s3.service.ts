import { PassThrough, Readable } from 'stream';

import { Injectable, Logger } from '@nestjs/common';

import {
  S3Client,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  CopyObjectCommand,
  type _Object as S3Object,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';

import {
  getSignedUrl as getCloudFrontSignedUrl,
  getSignedCookies,
} from '@aws-sdk/cloudfront-signer';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { Upload } from '@aws-sdk/lib-storage';

import internal from 'stream';

import { APP_CONFIGS } from '@app/common/configs/app.config';

import { Agent } from 'https';

import { posix } from 'path';

import { S3ObjectSize } from '@app/common/interfaces/s3.interface';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';

// CloudFront signing interfaces
export interface SignedCookies {
  'CloudFront-Key-Pair-Id': string;
  'CloudFront-Policy'?: string;
  'CloudFront-Signature'?: string;
}

export interface SignedUrl {
  signedCookies: SignedCookies;
  signedUrl: string;
  url: string;
}
export interface CloudFrontSignedUrlParams {
  episodeId: string;
  expirationTimeInSeconds?: number;
  urlPrefix: string;
}

export interface CloudFrontFolderSignedUrlParams {
  expirationTimeInSeconds?: number;
  folderPath: string;
}

export interface FolderSignedUrlResult {
  epochDuration: number;
  keyPairId: string;
  policy: string;
  signedCookies: SignedCookies;
}

interface MoveS3DirectoryOptions {
  concurrency?: number;
  deleteSource?: boolean;
  destinationBucket?: string;
  destinationPrefix: string;
  sourceBucket: string;
  sourcePrefix: string;
}

interface ErrorEntry {
  error: string;
  sourceKey: string;
  timestamp: string;
}

interface InitiateMultipartUploadParams {
  bucket: string;
  filePath: string;
  mimeType: string;
}

interface GenerateMultipartUploadPartUrlParams {
  bucket: string;
  filePath: string;
  partNumber: number;
  uploadId: string;
}

interface CompleteMultipartUploadParams {
  bucket: string;
  filePath: string;
  parts: { ETag: string; PartNumber: number }[];
  uploadId: string;
}

interface AbortMultipartUploadParams {
  bucket: string;
  filePath: string;
  uploadId: string;
}

@Injectable()
export class S3Service {
  private readonly httpHandler = new NodeHttpHandler({
    httpAgent: new Agent({
      maxSockets: 500,
    }),
    socketAcquisitionWarningTimeout: 5000, // Increase warning threshold
  });
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Instance: S3Client;
  private readonly UPLOAD_URL_EXPIRY = 60 * 60 * 24; // 1 day in seconds

  constructor(private readonly errorHandler: ErrorHandlerService) {
    this.s3Instance = new S3Client({
      // credentials: {
      //   accessKeyId: APP_CONFIGS.AWS.ACCESS_KEY_ID,
      //   secretAccessKey: APP_CONFIGS.AWS.SECRET_ACCESS_KEY,
      // },
      region: APP_CONFIGS.AWS.S3.REGION,
      requestHandler: this.httpHandler,
    });
  }

  // Helper functions with type annotations
  private encodeS3Key(key: string): string {
    return key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  /**
   * Generates CloudFront policy for URL signing
   */
  private generateCloudFrontPolicy(
    allowedRoute: string,
    epochDuration: number,
  ): string {
    return JSON.stringify({
      Statement: [
        {
          Condition: {
            DateLessThan: {
              'AWS:EpochTime': epochDuration,
            },
          },
          Resource: allowedRoute,
        },
      ],
    });
  }

  private validateS3Path(str: string): boolean {
    return typeof str === 'string' && str.length > 0;
  }

  async abortMultipartUpload({
    bucket,
    filePath,
    uploadId,
  }: AbortMultipartUploadParams): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: posix.normalize(filePath),
      UploadId: uploadId,
    });

    await this.s3Instance.send(command);
  }

  /**
   * Generates CloudFront signed URL and cookies for video content
   */
  cloudFrontSignedUrl({
    episodeId,
    expirationTimeInSeconds = APP_CONFIGS.AWS.CLOUDFRONT
      .FREE_CONTENT_EXPIRATION_TIME, // 20 mins
    urlPrefix,
  }: CloudFrontSignedUrlParams): SignedUrl {
    const epochDuration = Math.floor(
      (new Date().getTime() + expirationTimeInSeconds * 1000) / 1000,
    );
    const allowedRoute = `${urlPrefix}/*`;
    const url = `${urlPrefix}/playlist.m3u8?env=${process.env.NODE_ENV}&epId=${episodeId}`;

    // Get CloudFront credentials from environment
    const keyPairId = APP_CONFIGS.AWS.CLOUDFRONT.ACCESS_KEY_ID;
    const privateKey = APP_CONFIGS.AWS.CLOUDFRONT.PRIVATE_KEY;

    const policy = this.generateCloudFrontPolicy(allowedRoute, epochDuration);

    // Sign the URL using AWS SDK v3 CloudFront signer
    const signedUrl = getCloudFrontSignedUrl({
      keyPairId,
      policy,
      privateKey,
      url,
    });

    // Get signed cookies using AWS SDK v3 CloudFront signer
    const signedCookies: SignedCookies = getSignedCookies({
      keyPairId,
      policy,
      privateKey,
      url,
    });

    return { signedCookies: signedCookies, signedUrl, url };
  }

  cloudFrontSignedUrlForFolder({
    expirationTimeInSeconds = APP_CONFIGS.AWS.CLOUDFRONT
      .BATCH_SIGNED_URL_EXPIRATION_TIME, // 60 mins default
    folderPath,
  }: CloudFrontFolderSignedUrlParams): FolderSignedUrlResult {
    const epochDuration = Math.floor(
      (new Date().getTime() + expirationTimeInSeconds * 1000) / 1000,
    );
    const allowedRoute = `${folderPath}/*`;

    // Get CloudFront credentials from environment
    const keyPairId = APP_CONFIGS.AWS.CLOUDFRONT.ACCESS_KEY_ID;
    const privateKey = APP_CONFIGS.AWS.CLOUDFRONT.PRIVATE_KEY;

    const policy = this.generateCloudFrontPolicy(allowedRoute, epochDuration);

    // Use folder path as base URL for cookie signing
    const baseUrl = folderPath;

    // Get signed cookies using AWS SDK v3 CloudFront signer
    const signedCookies: SignedCookies = getSignedCookies({
      keyPairId,
      policy,
      privateKey,
      url: baseUrl,
    });

    return {
      epochDuration,
      keyPairId,
      policy,
      signedCookies,
    };
  }
  async completeMultipartUpload({
    bucket,
    filePath,
    parts,
    uploadId,
  }: CompleteMultipartUploadParams): Promise<void> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: posix.normalize(filePath),
      MultipartUpload: {
        Parts: parts,
      },
      UploadId: uploadId,
    });

    await this.s3Instance.send(command);
  }

  async downloadFileContentAsString({
    bucket,
    key,
  }: {
    bucket: string;
    key: string;
  }): Promise<string> {
    const [content] = await this.errorHandler.try(
      async () => {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        const response = await this.s3Instance.send(command);
        const content = await response.Body?.transformToString();
        return content;
      },
      (error) => {
        throw error;
      },
    );

    return this.errorHandler.raiseErrorIfNull(
      content,
      new Error(`Failed to download file from S3: s3://${bucket}/${key}`),
    );
  }

  async downloadImageAsBuffer(s3Url: string): Promise<Buffer> {
    const { bucket, key } = this.parseS3Url(s3Url);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.s3Instance.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  }

  generateArtistImageUploadUrl(
    artistId: string,
    contentType: string,
    fileExtension: string,
  ): Promise<string> {
    const { bucket, filePath } = MediaFilePathUtils.generateArtistImageFilePath(
      {
        fileExtension,
        fileName: artistId,
      },
    );
    const command = new PutObjectCommand({
      Bucket: bucket,
      ContentType: contentType,
      Key: posix.normalize(filePath),
    });

    return getSignedUrl(this.s3Instance, command, {
      expiresIn: this.UPLOAD_URL_EXPIRY,
    });
  }

  /**
   * Generates a pre-signed URL for uploading files
   */
  generateArtistUploadSignedUrl({
    contentType,
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
    contentType: string;
  }): Promise<string> {
    const { bucket, filePath } = MediaFilePathUtils.generateArtistImageFilePath(
      {
        fileExtension,
        fileName,
      },
    );
    const command = new PutObjectCommand({
      Bucket: bucket,
      ContentType: contentType,
      Key: posix.normalize(filePath),
    });
    return getSignedUrl(this.s3Instance, command, {
      expiresIn: this.UPLOAD_URL_EXPIRY,
    });
  }

  async generateMultipartUploadPartUrl({
    bucket,
    filePath,
    partNumber,
    uploadId,
  }: GenerateMultipartUploadPartUrlParams): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: posix.normalize(filePath),
      PartNumber: partNumber,
      UploadId: uploadId,
    });

    return getSignedUrl(this.s3Instance, command, {
      expiresIn: this.UPLOAD_URL_EXPIRY,
    });
  }

  async generateUploadSignedUrl({
    bucket,
    filePath,
    mimeType,
  }: {
    bucket: string;
    mimeType: string;
    filePath: string;
  }): Promise<{ signedUrl: string; baseUrl: string }> {
    const command = new PutObjectCommand({
      // ACL: 'public-read',
      Bucket: bucket,
      ContentType: mimeType,
      Key: posix.normalize(filePath),
    });

    const signedUrl = await getSignedUrl(this.s3Instance, command, {
      expiresIn: this.UPLOAD_URL_EXPIRY,
    });

    // Extract the base URL without query parameters
    // The signed URL format is: https://bucket-name.s3.region.amazonaws.com/key?query-params
    const baseUrl = signedUrl.split('?')[0];

    return {
      baseUrl,
      signedUrl: signedUrl,
    };
  }

  /**
   * Generates a pre-signed URL for downloading files
   */
  async generateViewSignedUrl({
    bucket = '', // Make bucket optional
    key,
  }: {
    bucket?: string;
    key: string;
  }): Promise<string> {
    let finalBucket = bucket;
    let finalKey = key;

    // Auto-detect S3 URL if bucket is empty
    if (!finalBucket) {
      const parsed = this.errorHandler.raiseErrorIfNull(
        this.parseS3Url(key),
        new Error('Invalid S3 URL format when bucket is unspecified'),
      );
      finalBucket = parsed.bucket;
      finalKey = parsed.key;
    }

    const command = new GetObjectCommand({
      Bucket: finalBucket,
      Key: posix.normalize(finalKey),
    });

    return getSignedUrl(this.s3Instance, command, {
      expiresIn: 3600, // Adjust expiry as needed
    });
  }

  async getDiskAllocationFromS3File({
    bucket,
    key,
    maxDiskMB,
  }: {
    bucket: string;
    key: string;
    maxDiskMB: number;
  }): Promise<number> {
    const [fileSize] = await this.errorHandler.try(
      async () => this.getS3ObjectSize({ bucket, key }),
      (error) => {
        this.logger.warn(
          { bucket, error, key },
          'Failed to get S3 file size, using default disk size',
        );
        return null;
      },
    );

    const multiplier = APP_CONFIGS.AWS.ECS.DISK_SIZE_MULTIPLIER;
    const minDiskMB = APP_CONFIGS.AWS.ECS.MIN_DISK_MB;
    const incrementMB = APP_CONFIGS.AWS.ECS.DISK_SIZE_INCREMENT_MB;

    let diskSizeMB: number;

    if (fileSize === null) {
      diskSizeMB = APP_CONFIGS.AWS.ECS.DEFAULT_EPHEMERAL_STORAGE_MB;
    } else {
      const calculatedDiskMB = Math.max(
        minDiskMB,
        Math.ceil(fileSize.inMB * multiplier),
      );

      diskSizeMB =
        Math.min(
          Math.ceil(calculatedDiskMB / incrementMB) * incrementMB,
          maxDiskMB,
        ) || minDiskMB;

      diskSizeMB = Math.max(diskSizeMB, minDiskMB);
    }

    return Math.ceil(diskSizeMB / 1024);
  }

  async getObjectAsStream(s3Url: string): Promise<Readable> {
    const { bucket, key } = this.parseS3Url(s3Url);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.s3Instance.send(command);
    const s3Stream = response.Body as Readable;

    if (!s3Stream) {
      throw Errors.CMS.S3_ERROR('Failed to get stream from S3');
    }
    return s3Stream;
  }

  async getS3ObjectSize({
    bucket,
    key,
  }: {
    bucket: string;
    key: string;
  }): Promise<S3ObjectSize> {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.s3Instance.send(command);
    const sizeInBytes = response.ContentLength ?? 0;

    return {
      inBytes: sizeInBytes,
      inGB: Number((sizeInBytes / 1_000_000_000).toFixed(2)),
      inKB: Number((sizeInBytes / 1_000).toFixed(2)),
      inMB: Number((sizeInBytes / 1_000_000).toFixed(2)),
    };
  }

  async initiateMultipartUpload({
    bucket,
    filePath,
    mimeType,
  }: InitiateMultipartUploadParams): Promise<{
    uploadId: string;
    key: string;
  }> {
    const command = new CreateMultipartUploadCommand({
      // ACL: 'public-read',
      Bucket: bucket,
      ContentType: mimeType,
      Key: posix.normalize(filePath),
    });

    const response = await this.s3Instance.send(command);

    if (!response.UploadId) {
      throw new Error('Failed to initiate multipart upload');
    }

    return {
      key: response.Key || filePath,
      uploadId: response.UploadId,
    };
  }

  async listObjects(bucket: string, prefix: string): Promise<string[]> {
    const [result] = await this.errorHandler.try(
      async () => {
        const listResponse = await this.s3Instance.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
          }),
        );

        return (listResponse.Contents || [])
          .map((object) => object.Key)
          .filter((key): key is string => key !== undefined);
      },
      (error) => {
        this.logger.error(
          { bucket, error, prefix },
          'Failed to list objects from S3',
        );
      },
    );

    return result || [];
  }

  async moveS3Directory(options: MoveS3DirectoryOptions): Promise<void> {
    // Destructure with defaults
    const {
      concurrency = 10000,
      deleteSource = false,
      sourceBucket,
      destinationBucket = sourceBucket,
      destinationPrefix,
      sourcePrefix,
    } = options;

    // Validate inputs
    if (!this.validateS3Path(sourceBucket))
      throw new Error('Invalid source bucket');
    if (!this.validateS3Path(sourcePrefix))
      throw new Error('Invalid source prefix');
    if (!this.validateS3Path(destinationPrefix))
      throw new Error('Invalid destination prefix');

    let continuationToken: string | undefined = undefined;
    let processedCount = 0;
    const errors: ErrorEntry[] = [];

    try {
      performance.mark('start');
      do {
        const listResponse: ListObjectsV2CommandOutput =
          await this.s3Instance.send(
            new ListObjectsV2Command({
              Bucket: sourceBucket,
              ContinuationToken: continuationToken,
              Prefix: sourcePrefix.endsWith('/')
                ? sourcePrefix
                : `${sourcePrefix}/`,
            }),
          );

        const objects: S3Object[] = listResponse.Contents || [];

        // Process in batches with concurrency control
        for (let i = 0; i < objects.length; i += concurrency) {
          const batch: S3Object[] = objects.slice(i, i + concurrency);

          await Promise.all(
            batch.map(async (object: S3Object) => {
              try {
                // Validate object key with type guard
                if (!object?.Key) {
                  throw new Error('Object has no Key property');
                }

                const sourceKey: string = object.Key;

                // Validate key structure
                if (!sourceKey.startsWith(sourcePrefix)) {
                  throw new Error(
                    `Key ${sourceKey} does not match source prefix ${sourcePrefix}`,
                  );
                }

                // Build destination path
                const relativePath = sourceKey.slice(sourcePrefix.length);
                const destinationKey = `${destinationPrefix}${relativePath}`;

                // Validate destination key
                if (!this.validateS3Path(destinationKey)) {
                  throw new Error(`Invalid destination key: ${destinationKey}`);
                }

                // Copy operation
                await this.s3Instance.send(
                  new CopyObjectCommand({
                    Bucket: destinationBucket,
                    CopySource: `${sourceBucket}/${this.encodeS3Key(sourceKey)}`,
                    Key: destinationKey,
                  }),
                );

                // Conditional delete
                if (deleteSource) {
                  // await this.s3Instance.send(
                  //   new DeleteObjectCommand({
                  //     Bucket: sourceBucket,
                  //     Key: sourceKey,
                  //   }),
                  // );
                }

                processedCount++;
                // console.log(
                //   `Moved: s3://${sourceBucket}/${sourceKey} → s3://${destinationBucket}/${destinationKey}`,
                // );
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                errors.push({
                  error: errorMessage,
                  sourceKey: object?.Key || 'UNKNOWN_KEY',
                  timestamp: new Date().toISOString(),
                });
                console.error(
                  `Error processing ${object?.Key || 'UNKNOWN_OBJECT'}:`,
                  errorMessage,
                );
              }
            }),
          );
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      performance.mark('end');
      performance.measure('moveS3Directory', 'start', 'end');
      console.log(
        `\nOperation complete. Processed ${processedCount} objects. Time taken: ${performance.getEntriesByName('moveS3Directory')[0].duration}ms`,
      );
      if (errors.length > 0) {
        console.error(`Encountered ${errors.length} errors:`);
        console.table(errors);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Critical operation error:', errorMessage);
      throw error;
    }
  }

  parseS3Url(url: string): { bucket: string; key: string } {
    // Allow new URL() to throw if the URL is malformed
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    const pathname = parsed.pathname; // Pathname includes the leading slash

    // Virtual-hosted style: https://bucket.s3.region.amazonaws.com/key
    // Example: stagemediaimage.s3.ap-south-1.amazonaws.com
    if (hostParts.length >= 3 && hostParts[1] === 's3') {
      // Simplified check
      return {
        bucket: hostParts[0],
        key: pathname.startsWith('/') ? pathname.slice(1) : pathname, // Remove leading slash from key
      };
    }

    // Path-style: https://s3.region.amazonaws.com/bucket/key
    // Example: s3.ap-south-1.amazonaws.com
    if (
      parsed.hostname.startsWith('s3.') &&
      parsed.hostname.includes('.amazonaws.com')
    ) {
      // Ensure pathname starts with /bucket/
      if (!pathname || pathname.length < 2 || pathname === '/') {
        throw new Error(
          `Invalid S3 path-style URL: missing bucket/key in path for ${url}`,
        );
      }
      const pathSegments = pathname.slice(1).split('/'); // Remove leading slash and split
      const bucket = pathSegments[0];
      const key = pathSegments.slice(1).join('/');
      return {
        bucket,
        key,
      };
    }

    // If neither pattern matched, throw an error
    throw new Error(`URL does not match expected S3 format: ${url}`);
  }

  signCloudFrontUrlWithPolicy({
    keyPairId,
    policy,
    url,
  }: {
    keyPairId: string;
    policy: string;
    url: string;
  }): string {
    const privateKey = APP_CONFIGS.AWS.CLOUDFRONT.PRIVATE_KEY;
    return getCloudFrontSignedUrl({
      keyPairId,
      policy,
      privateKey,
      url,
    });
  }

  async uploadFileBuffer({
    bucket,
    buffer,
    filePath,
    mimeType,
  }: {
    bucket: string;
    filePath: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    const command = new PutObjectCommand({
      Body: buffer,
      Bucket: bucket,
      ContentType: mimeType,
      Key: posix.normalize(filePath),
    });

    const response = await this.s3Instance.send(command);
    return response;
  }

  /**
   * Uploads a file stream to S3
   */
  async uploadFileStream({
    bucket,
    filePath,
    mimeType,
    size,
    stream,
    uploadProgress,
  }: {
    bucket: string;
    filePath: string;
    size?: number;
    mimeType: string;
    stream: internal.Readable;
    uploadProgress: (progress: number) => void;
  }) {
    const DEFAULT_PART_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_PARTS = 10000;

    let partSize = DEFAULT_PART_SIZE;

    if (size) {
      const minPartSize = Math.ceil(size / MAX_PARTS);
      if (minPartSize > DEFAULT_PART_SIZE) {
        partSize = minPartSize;
        this.logger.warn(
          `Adjusting part size to ${partSize / 1024 / 1024}MB ` +
            `for ${(size / 1024 / 1024 / 1024).toFixed(2)}GB file`,
        );
      }
    }
    let transferredBytes = 0;
    let lastReportedPercentage = -1; // Initialize to ensure first update

    const normalizedFilePath = posix.normalize(filePath);

    const passThrough = new PassThrough();

    stream.on('error', (error: Error) => {
      throw new Error(
        `Source stream error for ${normalizedFilePath}: ${error.message}`,
      );
    });

    stream.pipe(passThrough);

    passThrough.on('data', (chunk) => {
      transferredBytes += chunk.length;
      const totalSize = Number(size || 0);
      const percentage = totalSize
        ? Math.floor((transferredBytes / totalSize) * 100)
        : 0;

      // Throttle updates to 5% increments
      if (percentage >= lastReportedPercentage + 1 || percentage === 100) {
        this.logger.debug(
          `Transferred ${(transferredBytes / 1024 / 1024).toFixed(2)} of ${(
            totalSize /
            1024 /
            1024
          ).toFixed(2)} MB (${percentage}%)`,
        );
        uploadProgress?.(percentage);
        lastReportedPercentage = percentage;
      }
    });

    const command = new Upload({
      client: this.s3Instance,
      params: {
        Body: passThrough,
        Bucket: bucket,
        ContentType: mimeType ?? 'application/octet-stream',
        Key: normalizedFilePath,
      },
      partSize,
    });

    const response = await command.done();
    uploadProgress?.(100);
    this.logger.log(`Successfully uploaded file ${normalizedFilePath} to S3`);
    return response;
  }
}
