import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthGuard } from './guards/auth.guard';
import { JwtService } from './services/jwtService';
import { ErrorHandlerModule } from '@app/error-handler';

@Module({
  exports: [JwtService],
  imports: [ErrorHandlerModule],
  providers: [JwtService, Reflector, AuthGuard],
})
export class AuthModule {}
