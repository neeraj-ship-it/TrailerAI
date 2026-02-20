import { Injectable, Logger } from '@nestjs/common';

import { ObjectId } from 'mongodb';

import {
  ArtistDetailsDto,
  CreateArtistDto,
  GenerateArtistImageUploadUrlDto,
} from '../dtos/artist.dto';
import { ArtistRepositoryV2 } from '../repositories/artist.repository';
import { ArtistRepository } from '@app/cms/repositories/artist-v1.repository';
import { Errors } from '@app/error-handler';
import { S3Service } from '@app/storage';
import { ArtistStatusEnum } from 'common/entities/artist-v2.entity';
import { ArtistV2 } from 'common/entities/artist-v2.entity';
import { MediaFilePathUtils } from 'common/utils/media-file.utils';
// Constants
const ARTIST_CONFIG = {
  S3: {
    BUCKET: 'stagemediaimage',
    CLOUDFRONT_URL: 'https://d2o27wiylbnb68.cloudfront.net',
    PATH: 'artist',
    S3_URL: 'https://stagemediavideo.s3.ap-south-1.amazonaws.com',
  },
} as const;

// Types for migration
interface MigratedArtist {
  en: { name: string; description: string } | null;
  hin: { name: string; description: string } | null;
  image: string | null;
  slug: string;
}

interface OldArtist {
  _id: string | number | ObjectId;
  description?: string;
  displayLanguage?: 'en' | 'hin';
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  slug?: string;
}

@Injectable()
export class ArtistService {
  private readonly logger = new Logger(ArtistService.name);

  constructor(
    private readonly artistRepositoryV2: ArtistRepositoryV2,
    private readonly artistRepository: ArtistRepository,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Constructs an S3 URL for an artist image
   */
  private constructS3Url(artistId: string, fileExtension: string): string {
    return `${ARTIST_CONFIG.S3.S3_URL}/${ARTIST_CONFIG.S3.PATH}/${artistId}.${fileExtension}`;
  }

  /**
   * Creates new artists in the V2 schema from grouped data
   */
  private async createNewArtists(
    artistsBySlug: Record<string, MigratedArtist>,
  ): Promise<void> {
    for (const slug in artistsBySlug) {
      const groupedArtist = artistsBySlug[slug];
      const { en, hin } = groupedArtist;

      if (!en && !hin) {
        this.logger.warn(
          `No English or Hindi data found for slug: ${slug}. Skipping.`,
        );
        continue;
      }

      try {
        const newArtist = this.artistRepositoryV2.create({
          description: {
            en: en?.description || hin?.description || '',
            hin: hin?.description || en?.description || '',
          },
          image: groupedArtist.image || '',
          name: {
            en: en?.name || hin?.name || '',
            hin: hin?.name || en?.name || '',
          },
          slug: slug,
          status: ArtistStatusEnum.ACTIVE,
        });

        await this.artistRepositoryV2.save(newArtist);
        this.logger.log(
          `Successfully migrated artist with slug: ${slug} to new collection with ID: ${newArtist.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to migrate artist with slug: ${slug}. Error: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Creates a signed URL for an artist image
   */
  private createSignedImageViewURL(image: string): Promise<string> {
    return this.s3Service.generateViewSignedUrl({
      bucket: ARTIST_CONFIG.S3.BUCKET,
      key: `${ARTIST_CONFIG.S3.PATH}/${image}`,
    });
  }

  /**
   * Extracts the file name from an S3 URL
   */
  private extractFileNameFromUrl(imageUrl: string): string {
    this.logger.debug('Extracting file name from URL:', imageUrl);

    if (!imageUrl.startsWith(ARTIST_CONFIG.S3.S3_URL)) {
      throw new Error('Invalid image URL format');
    }

    const fileName = imageUrl.split(
      `${ARTIST_CONFIG.S3.S3_URL}/${ARTIST_CONFIG.S3.PATH}/`,
    );
    if (fileName.length !== 2) {
      throw new Error('Invalid image URL format');
    }

    return fileName[1];
  }

  /**
   * Groups artists by slug, separating English and Hindi versions
   */
  private groupArtistsBySlug(
    artists: OldArtist[],
  ): Record<string, MigratedArtist> {
    return artists.reduce(
      (acc, artist) => {
        const slug = artist.slug;
        if (!slug) {
          this.logger.warn(
            `Artist with ID ${artist._id} is missing a slug. Skipping.`,
          );
          return acc;
        }

        if (!acc[slug]) {
          acc[slug] = { en: null, hin: null, image: null, slug };
        }

        if (artist.displayLanguage === 'en') {
          acc[slug].en = {
            description: artist.description || '',
            name: `${artist.firstName || ''} ${artist.lastName || ''}`.trim(),
          };
        } else if (artist.displayLanguage === 'hin') {
          acc[slug].hin = {
            description: artist.description || '',
            name: `${artist.firstName || ''} ${artist.lastName || ''}`.trim(),
          };
        }

        if (artist.profilePic) {
          acc[slug].image = artist.profilePic;
        }

        return acc;
      },
      {} as Record<string, MigratedArtist>,
    );
  }

  /**
   * Creates a new artist
   */
  async createArtist(artist: CreateArtistDto): Promise<ArtistDetailsDto> {
    const newArtist = this.artistRepositoryV2.create({
      description: {
        en: artist.description.en,
        hin: artist.description.hin,
      },
      image: this.extractFileNameFromUrl(artist.image),
      name: {
        en: artist.name.en,
        hin: artist.name.hin,
      },
      slug: crypto.randomUUID(),
      status: ArtistStatusEnum.ACTIVE,
    });

    await this.artistRepositoryV2.save(newArtist);

    return {
      description: newArtist.description,
      id: newArtist.id,
      image: MediaFilePathUtils.generateImageViewURL({
        contentType: 'artist',
        fileName: newArtist.image,
      }),
      name: newArtist.name,
      slug: newArtist.slug,
    };
  }

  /**
   * Soft deletes an artist by setting status to DELETED
   */
  async deleteArtist(artistId: string): Promise<void> {
    const artist = await this.artistRepositoryV2.findOneOrFail(
      { _id: new ObjectId(artistId) },
      {
        failHandler: () => Errors.ARTIST.ARTIST_NOT_FOUND(),
      },
    );

    artist.status = ArtistStatusEnum.DELETED;
    await this.artistRepositoryV2.save(artist);
  }

  /**
   * Generates a pre-signed URL for uploading artist images
   */
  async generateArtistImageUploadUrl(
    body: GenerateArtistImageUploadUrlDto,
  ): Promise<{ fileUrl: string; url: string }> {
    const url = await this.s3Service.generateArtistImageUploadUrl(
      body.artistId,
      body.contentType,
      body.fileExtension,
    );

    return {
      fileUrl: this.constructS3Url(body.artistId, body.fileExtension),
      url,
    };
  }

  /**
   * Retrieves details of a specific artist
   */
  async getArtistDetails(id: string): Promise<ArtistDetailsDto> {
    return this.artistRepositoryV2.findOneOrFail(
      { id, status: ArtistStatusEnum.ACTIVE },
      {
        failHandler: () => Errors.ARTIST.ARTIST_NOT_FOUND(),
      },
    );
  }

  /**
   * Lists all active artists
   */
  async listAllArtists(): Promise<ArtistDetailsDto[]> {
    const artists = await this.artistRepositoryV2.findAll({
      orderBy: {
        createdAt: 'DESC',
      },
      where: {
        status: ArtistStatusEnum.ACTIVE,
      },
    });

    return Promise.all(
      artists.map(async (artist) => ({
        ...artist,
        id: artist._id.toString(),
        image: MediaFilePathUtils.generateImageViewURL({
          contentType: 'artist',
          fileName: artist.image,
        }),
      })),
    );
  }

  /**
   * Migrates artists from the old schema to the new V2 schema
   */
  async migrateArtists(): Promise<void> {
    const artists = await this.artistRepository.find({});
    const artistsBySlug = this.groupArtistsBySlug(artists as OldArtist[]);
    await this.createNewArtists(artistsBySlug);
  }

  /**
   * Searches for artists by name
   */
  async searchArtist(name: string): Promise<ArtistDetailsDto[]> {
    const artists = await this.artistRepositoryV2.aggregate([
      {
        $match: {
          $or: [
            { 'name.en': { $options: 'i', $regex: name } },
            { 'name.hin': { $options: 'i', $regex: name } },
          ],
          status: ArtistStatusEnum.ACTIVE,
        },
      },
    ]);

    return Promise.all(
      artists.map(async (artist: ArtistV2) => ({
        ...artist,
        id: artist._id.toString(),
        image: await this.createSignedImageViewURL(artist.image),
      })),
    );
  }

  /**
   * Updates an existing artist
   */
  async updateArtist(
    id: string,
    payload: ArtistDetailsDto,
  ): Promise<ArtistDetailsDto> {
    this.logger.debug('Updating artist:', { id, payload });

    const artist = await this.artistRepositoryV2.findOneOrFail(
      { _id: new ObjectId(id) },
      {
        failHandler: () => Errors.ARTIST.ARTIST_NOT_FOUND(),
      },
    );

    if (artist.image) {
      const fileName = this.extractFileNameFromUrl(payload.image);
      artist.image = fileName;
    }

    artist.description = payload.description;
    artist.name = payload.name;
    await this.artistRepositoryV2.save(artist);

    return artist;
  }
}
