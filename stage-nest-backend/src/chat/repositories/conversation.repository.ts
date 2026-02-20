import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepository } from 'common/repositories/base.repository';

import { Conversation } from '../schemas/conversation.schema';

@Injectable()
export class ConversationRepository extends BaseRepository<Conversation> {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
  ) {
    super(conversationModel);
  }

  async addMessage(
    sessionId: string,
    message: { role: string; content: string; timestamp?: Date },
  ): Promise<Conversation | null> {
    return this.conversationModel
      .findOneAndUpdate(
        { sessionId },
        {
          $push: {
            messages: {
              ...message,
              timestamp: message.timestamp || new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();
  }

  async countByUser(userId: string): Promise<number> {
    return this.conversationModel.countDocuments({ userId });
  }

  async deleteOlderThan(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.conversationModel.deleteMany({
      updatedAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  async findBySessionId(sessionId: string): Promise<Conversation | null> {
    return this.conversationModel.findOne({ sessionId }).exec();
  }

  async findByUserAndCharacter(
    userId: string,
    characterId: string,
  ): Promise<Conversation[]> {
    return this.conversationModel
      .find({ characterId, userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findByUserId(userId: string): Promise<Conversation[]> {
    return this.conversationModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .exec();
  }
}
