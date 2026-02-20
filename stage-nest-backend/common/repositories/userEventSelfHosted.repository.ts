import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserEvent, UserEventData } from '../entities/user.event';
import { BaseRepository } from './base.repository';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class UserEventSelfHostedRepository extends BaseRepository<UserEvent> {
  constructor(
    @InjectModel(UserEvent.name, 'secondary')
    private userEventSelfHostedModel: Model<UserEvent>,
    @Inject(ErrorHandlerService)
    private errorHandlerService: ErrorHandlerService,
  ) {
    super(userEventSelfHostedModel);
  }

  async addFullUserEvent(userEvent: UserEvent | null): Promise<boolean> {
    if (!userEvent) {
      return false;
    }
    const userEventDoc = await this.userEventSelfHostedModel.findOneAndUpdate(
      { _id: userEvent._id },
      { $addToSet: { events: { $each: userEvent.events } } },
      { new: true, upsert: true },
    );
    return userEventDoc ? true : false;
  }

  async addUserEvent(
    userId: string,
    eventData: UserEventData,
  ): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId);

    let userEvent = await this.findOne({ _id: userObjectId });
    if (!userEvent) {
      // Create new user event document if it doesn't exist
      userEvent = await this.create({
        _id: userObjectId,
        events: [eventData],
      });
    } else {
      // Check if event with same eventName already exists
      const eventExists = userEvent.events.some(
        (event) => event.eventName === eventData.eventName,
      );
      if (eventExists) {
        return false;
      }
      userEvent.events.push(eventData);
      userEvent = await this.save(userEvent);
    }

    return true;
  }

  async getUserEventByEventName(
    userId: string,
    eventName: string,
  ): Promise<UserEventData | null> {
    const userEventDoc = await this.userEventSelfHostedModel.findOne(
      { _id: new Types.ObjectId(userId) },
      { events: { $elemMatch: { eventName: eventName } } },
    );

    if (
      !userEventDoc ||
      !userEventDoc.events ||
      userEventDoc.events.length === 0
    ) {
      return null;
    }

    return userEventDoc.events[0];
  }

  async getUserEvents(userId: string): Promise<UserEvent | null> {
    const userObjectId = new Types.ObjectId(userId);
    return this.findOne({ _id: userObjectId });
  }
}
