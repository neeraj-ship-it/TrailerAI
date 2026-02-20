import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserEvent, UserEventData } from '../entities/user.event';
import { BaseRepository } from './base.repository';
import { ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class UserEventRepository extends BaseRepository<UserEvent> {
  constructor(
    @InjectModel(UserEvent.name) private userEventModel: Model<UserEvent>,
    @Inject(ErrorHandlerService)
    private errorHandlerService: ErrorHandlerService,
  ) {
    super(userEventModel);
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
    // The optimized query from Option 2
    const userEventDoc = await this.userEventModel.findOne(
      { _id: new Types.ObjectId(userId) },
      { events: { $elemMatch: { eventName: eventName } } },
    );

    // If the document or the matching event within it isn't found, return null
    if (
      !userEventDoc ||
      !userEventDoc.events ||
      userEventDoc.events.length === 0
    ) {
      return null;
    }

    // Return just the single event object from the array
    return userEventDoc.events[0];
  }

  async getUserEvents(userId: string): Promise<UserEvent | null> {
    const userObjectId = new Types.ObjectId(userId);
    return this.findOne({ _id: userObjectId });
  }
}
