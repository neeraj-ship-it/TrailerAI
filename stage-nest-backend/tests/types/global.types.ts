import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GlobalThis } from 'type-fest';

export type ExtraGlobals = GlobalThis & {
  __MONGOD__?: MongoMemoryServer;
  __NEST_APP__?: NestFastifyApplication;
  __TEST_MODULE__?: TestingModule;
  __SETUP_COMPLETE__?: boolean;
};
