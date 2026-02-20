import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import {
  Dialect,
  Lang,
  OS,
  Platform,
  ClientAppIdEnum,
} from '@app/common/enums/app.enum';

export interface ContextUser {
  id: string;
  profileId: string;
}

export interface Token {
  token: string;
}

export interface Meta {
  appBuildNumber?: number;
  appId: ClientAppIdEnum | null;
  dialect: Dialect;
  lang: Lang;
  os: OS;
  platform: Platform;
}

export interface Context {
  meta: Meta;
  user: ContextUser;
}

export interface PlatformPublicContext {
  meta: Meta;
  user?: ContextUser;
}

export const Ctx = createParamDecorator((_, ctx: ExecutionContext): Context => {
  const request = ctx.switchToHttp().getRequest<FastifyRequest>();
  const context: Context = {
    meta: request.meta,
    user: request.user,
  };
  return context;
});

export const CtxUser = createParamDecorator(
  (_, ctx: ExecutionContext): ContextUser => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return request.user;
  },
);

export const CtxToken = createParamDecorator(
  (_, ctx: ExecutionContext): Token => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return request.token;
  },
);

export const CtxPlatformPublic = createParamDecorator(
  (_, ctx: ExecutionContext): PlatformPublicContext => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return {
      meta: request.meta,
      user: request.user,
    };
  },
);
