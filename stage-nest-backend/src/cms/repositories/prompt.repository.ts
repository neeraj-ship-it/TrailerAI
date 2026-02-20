import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { BaseRepository } from '@app/common/repositories/base.repository';

import { Prompt, UserPromptInput } from '../entities/prompt.entity';

export interface PromptResponseDto {
  _id: string;
  createdAt: Date;
  projectId: string;
  updatedAt: Date;
  userInput: UserPromptInput;
  version: number;
}

@Injectable()
export class PromptRepository extends BaseRepository<Prompt> {
  constructor(
    @InjectModel(Prompt.name)
    private readonly promptModel: Model<Prompt>,
  ) {
    super(promptModel);
  }

  async createPrompt(
    projectId: string,
    userInput: UserPromptInput,
  ): Promise<PromptResponseDto> {
    // Get the latest version for this project
    const latestPrompt = await this.promptModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .sort({ version: -1 })
      .lean();

    const nextVersion = latestPrompt ? latestPrompt.version + 1 : 1;

    const doc = await this.create({
      projectId: new Types.ObjectId(projectId),
      userInput,
      version: nextVersion,
    });

    const plain = await this.promptModel.findById(doc._id).lean();
    if (!plain) {
      throw new Error('Failed to retrieve created prompt');
    }

    return {
      _id: plain._id.toString(),
      createdAt: plain.createdAt,
      projectId: plain.projectId.toString(),
      updatedAt: plain.updatedAt,
      userInput: plain.userInput,
      version: plain.version,
    };
  }

  async findByProjectId(projectId: string): Promise<PromptResponseDto[]> {
    const docs = await this.promptModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ version: -1 })
      .lean();

    return docs.map((doc) => ({
      _id: doc._id.toString(),
      createdAt: doc.createdAt,
      projectId: doc.projectId.toString(),
      updatedAt: doc.updatedAt,
      userInput: doc.userInput,
      version: doc.version,
    }));
  }

  async findPromptById(promptId: string): Promise<PromptResponseDto | null> {
    const doc = await this.promptModel.findById(promptId).lean();
    if (!doc) return null;

    return {
      _id: doc._id.toString(),
      createdAt: doc.createdAt,
      projectId: doc.projectId.toString(),
      updatedAt: doc.updatedAt,
      userInput: doc.userInput,
      version: doc.version,
    };
  }
}
