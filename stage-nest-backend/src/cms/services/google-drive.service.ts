import { Injectable, Logger } from '@nestjs/common';
import { drive_v3, google } from 'googleapis';

import credentials from '../stage-72012-7ec89452d234.json';

import { Readable } from 'stream';

import {
  GetGoogleDriveFilesResponseDto,
  GoogleDriveFileDto,
} from '../dtos/files.dto';
import { GoogleDriveFile } from '../interfaces/files.interface';
@Injectable()
export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private logger = new Logger(GoogleDriveService.name);

  constructor() {
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ],
    });
    this.drive = google.drive({
      auth,
      version: 'v3',
    });
    // this.countVideoFiles('1Wf8LpA_kz9TMY1UXuvlcSjv-2daatPWx');
  }

  private async countVideoFiles(folderId: string): Promise<{
    totalFiles: number;
    mp4Count: number;
    movCount: number;
    totalSize: number;
  }> {
    try {
      let mp4Count = 0;
      let movCount = 0;
      let totalSize = 0;
      const foldersToProcess: string[] = [folderId];

      while (foldersToProcess.length > 0) {
        const currentFolderId = foldersToProcess.shift();
        if (!currentFolderId) {
          throw new Error('No folder ID to process');
        }
        let pageToken: string | undefined;

        do {
          // console.log('Processing folder', currentFolderId);
          const res = await this.drive.files.list({
            fields: 'nextPageToken, files(id, mimeType, size)',
            includeItemsFromAllDrives: true,
            pageSize: 1000,
            pageToken,
            q: `'${currentFolderId}' in parents and 
                trashed = false and 
                (mimeType = 'video/mp4' or 
                 mimeType = 'video/quicktime' or 
                 mimeType = 'application/vnd.google-apps.folder') and 
                mimeType != 'application/vnd.google-apps.shortcut'`,
            supportsAllDrives: true,
          });

          const items = res.data.files || [];
          for (const item of items) {
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              foldersToProcess.push(item.id || '');
            } else if (item.mimeType === 'video/mp4') {
              mp4Count++;
              totalSize += Number(item.size || 0);
            } else if (item.mimeType === 'video/quicktime') {
              movCount++;
              totalSize += Number(item.size || 0);
            }

            process.stdout.write(
              `\rProcessing folder ${mp4Count} MP4s, ${movCount} MOV files, ${totalSize / 1024 / 1024} MB`,
            );
          }

          pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);
      }

      console.log('From Google Drive', mp4Count, movCount, totalSize);
      return {
        movCount,
        mp4Count,
        totalFiles: mp4Count + movCount,
        totalSize,
      };
    } catch (error) {
      throw new Error(`Failed to count video files: ${error}`);
    }
  }

  private async getFileDetailsById(fileId: string) {
    const res = await this.drive.files.get({
      fields:
        'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, thumbnailLink, owners, videoMediaMetadata',
      fileId,
      supportsAllDrives: true,
    });

    return res.data;
  }

  private getFileIdFromLink(link: string) {
    // Extract file ID from Google Drive link
    // Only supports format: https://drive.google.com/file/d/{fileId}/view

    if (!link.includes('drive.google.com/file/d/')) {
      throw new Error('Invalid Google Drive link format');
    }

    const parts = link.split('/');
    const fileIdIndex = parts.indexOf('d') + 1;

    if (fileIdIndex >= parts.length) {
      throw new Error('Invalid Google Drive link format');
    }

    const fileId = parts[fileIdIndex];
    return fileId;
  }

  private async listMp4FilesFromFolder(
    folderId: string,
  ): Promise<GoogleDriveFile[]> {
    try {
      let allFiles: GoogleDriveFile[] = [];
      let pageToken: string | undefined;

      do {
        const res = await this.drive.files.list({
          fields:
            'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, owners, thumbnailLink, fileExtension, videoMediaMetadata)',
          includeItemsFromAllDrives: true,
          pageSize: 100,
          pageToken,
          q: `'${folderId}' in parents and 
              trashed = false and 
              mimeType = 'video/mp4' and 
              mimeType != 'application/vnd.google-apps.shortcut'`,
          supportsAllDrives: true, // REQUIRED
        });

        const files = (res.data.files || []).map((file) => ({
          createdTime: file.createdTime ?? null,
          fileExtension: file.name?.split('.').pop()?.toLowerCase() || null,
          iconLink: file.iconLink ?? null,
          id: file.id ?? null,
          isFolder: false, // Since we're filtering for MP4s
          mimeType: file.mimeType ?? null,
          modifiedTime: file.modifiedTime ?? null,
          name: file.name ?? null,
          owners: file.owners?.map((owner) => owner.displayName || '') || [],
          size: Number(file.size || null),
          thumbnailLink: file.thumbnailLink ?? null,
          videoMediaMetadata: {
            durationMillis: Number(
              file.videoMediaMetadata?.durationMillis || null,
            ),
            height: file.videoMediaMetadata?.height || null,
            width: file.videoMediaMetadata?.width || null,
          },
          webViewLink: file.webViewLink ?? null,
        }));

        allFiles = allFiles.concat(files);
        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      console.log(allFiles);

      return allFiles;
    } catch (error) {
      throw new Error(`Failed to list MP4 files: ${error}`);
    }
  }
  // Helper function to map to DTO with null safety
  private mapToDto(files: GoogleDriveFile[]): GoogleDriveFileDto[] {
    return files.map((f) => ({
      createdTime: f.createdTime ?? null,
      fileExtension:
        f.fileExtension ?? f.name?.split('.').pop()?.toLowerCase() ?? null,
      id: f.id ?? null,
      isFolder: f.isFolder ?? false,
      mimeType: f.mimeType ?? null,
      modifiedTime: f.modifiedTime ?? null,
      name: f.name ?? null,
      owners: f.owners ?? [],
      size: f.size ?? null,
      thumbnailLink: f.thumbnailLink ?? null,
      webViewLink: f.webViewLink ?? null,
    }));
  }

  private parseDriveUrl(url: string): string {
    const patterns = [
      /\/file\/d\/([^/]+)/,
      /\/folders\/([^/?]+)/,
      /[?&]id=([^&#]+)/,
      /\/uc\?id=([^&#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    throw new Error('Invalid Google Drive URL format');
  }

  // Remove duplicate files based on ID
  private removeDuplicates(files: GoogleDriveFileDto[]): GoogleDriveFileDto[] {
    const seen = new Set<string>();
    return files.filter((file) => {
      if (!file.id || seen.has(file.id)) return true;
      seen.add(file.id);
      return true;
    });
  }

  async getFileReadableStream(fileId: string): Promise<{
    metadata: drive_v3.Schema$File;
    stream: Readable;
  }> {
    const metadata = await this.getFileDetailsById(fileId);
    const res = await this.drive.files.get(
      {
        alt: 'media',
        fileId,
        supportsAllDrives: true,
      },
      {
        responseType: 'stream',
      },
    );
    return {
      metadata: metadata,
      stream: res.data,
    };
  }

  async getResourceDetails(resourceId: string): Promise<GoogleDriveFile> {
    try {
      const res = await this.drive.files.get({
        fields:
          'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, owners, thumbnailLink, fileExtension, videoMediaMetadata',
        fileId: resourceId,
        supportsAllDrives: true,
      });

      if (!res.data) {
        throw new Error('Resource not found');
      }

      return {
        createdTime: res.data.createdTime ?? null,
        fileExtension: res.data.name?.split('.').pop()?.toLowerCase() || null,
        iconLink: res.data.iconLink ?? null,
        id: res.data.id ?? null,
        isFolder: res.data.mimeType === 'application/vnd.google-apps.folder',
        mimeType: res.data.mimeType ?? null,
        modifiedTime: res.data.modifiedTime ?? null,
        name: res.data.name ?? null,
        owners: res.data.owners?.map((owner) => owner.displayName || '') || [],
        size: Number(res.data.size || null),
        thumbnailLink: res.data.thumbnailLink ?? null,
        videoMediaMetadata: {
          durationMillis: parseInt(
            res.data.videoMediaMetadata?.durationMillis || '0',
          ),
          height: res.data.videoMediaMetadata?.height || null,
          width: res.data.videoMediaMetadata?.width || null,
        },
        webViewLink: res.data.webViewLink ?? null,
      };
    } catch (error) {
      throw new Error(`Failed to get resource details: ${error}`);
    }
  }

  async processDriveLink(
    urls: string[],
  ): Promise<GetGoogleDriveFilesResponseDto> {
    try {
      // Validate input is array of strings
      if (!Array.isArray(urls)) {
        throw new Error('Invalid input: expected array of URLs');
      }

      const allFiles: GoogleDriveFileDto[] = [];

      // Process all URLs in parallel
      await Promise.all(
        urls.map(async (url) => {
          // Validate individual URL format
          if (typeof url !== 'string' || !url.trim()) {
            throw new Error(`Invalid URL format: ${url}`);
          }

          // Extract resource ID from URL
          const resourceId = this.parseDriveUrl(url);

          // Get resource metadata
          const resource = await this.getResourceDetails(resourceId);

          // Process based on resource type
          if (resource.isFolder) {
            const folderFiles = await this.listMp4FilesFromFolder(resourceId);
            allFiles.push(...this.mapToDto(folderFiles));
          } else {
            // Map single resource to DTO and add to allFiles
            const [fileDto] = this.mapToDto([resource]);
            if (fileDto) {
              allFiles.push(fileDto);
            }
          }
        }),
      );

      // Remove potential duplicates from multiple URLs
      const uniqueFiles = this.removeDuplicates(allFiles);

      return { files: uniqueFiles };
    } catch (error: unknown) {
      this.logger.error(`Error processing drive links: ${error}`);
      throw new Error('Failed to process one or more drive links');
    }
  }
}
