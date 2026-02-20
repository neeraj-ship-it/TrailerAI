import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, Param } from '@nestjs/common';

import {
  type AddUserEventRequest,
  type AddUserEventResponse,
  type GetUserEventsResponse,
} from '../dtos/userEvent.dto';
import { UserEventService } from '../services/userEvent.service';
import { CtxUser, Ctx } from '@app/auth';
import {
  type Context,
  type ContextUser,
} from '@app/auth/decorators/context.decorator';

@Controller('user-events')
export class UserEventController {
  constructor(private readonly userEventService: UserEventService) {}

  @TypedRoute.Post('/')
  async addUserEvent(
    @Ctx() ctx: Context,
    @TypedBody() body: AddUserEventRequest,
  ): Promise<AddUserEventResponse> {
    const dialect = ctx.meta.dialect;
    const os = ctx.meta.os;
    return this.userEventService.addUserEvent(ctx.user.id, os, dialect, {
      eventName: body.eventName,
      metadata: body.metadata,
    });
  }

  @TypedRoute.Get('/')
  async getUserEvents(
    @CtxUser() user: ContextUser,
  ): Promise<GetUserEventsResponse> {
    return this.userEventService.getUserEvents(user.id);
  }

  @TypedRoute.Get('/by-event-name/:eventName')
  async getUserEventsByEventName(
    @CtxUser() user: ContextUser,
    @Param('eventName') eventName: string,
  ): Promise<GetUserEventsResponse> {
    return this.userEventService.getUserEventByEventName(user.id, eventName);
  }
}
