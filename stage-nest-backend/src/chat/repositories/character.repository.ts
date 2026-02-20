import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepository } from 'common/repositories/base.repository';

import { Character } from '../entities/character.entity';

@Injectable()
export class CharacterRepository extends BaseRepository<Character> {
  constructor(
    @InjectModel(Character.name)
    private readonly characterModel: Model<Character>,
  ) {
    super(characterModel);
  }

  async countByShow(showSlug: string): Promise<number> {
    return this.characterModel.countDocuments({ isActive: true, showSlug });
  }

  async existsAndActive(slug: string): Promise<boolean> {
    const character = await this.findOne({ isActive: true, slug });
    return !!character;
  }

  async findActiveByShowSlug(showSlug: string): Promise<Character[]> {
    const characters = await this.find(
      { isActive: true, showSlug },
      undefined,
      { sort: { order: 1 } },
    );
    return characters || [];
  }

  async findAllActive(): Promise<Character[]> {
    const characters = await this.find({ isActive: true }, undefined, {
      sort: { order: 1 },
    });
    return characters || [];
  }

  async findByCharacterId(slug: string): Promise<Character | null> {
    return this.findOne({ isActive: true, slug });
  }

  async findBySlugIncludingInactive(slug: string): Promise<Character | null> {
    return this.findOne({ slug });
  }
}
