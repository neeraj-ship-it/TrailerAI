// test/globalTeardown.ts
import { ExtraGlobals } from './types/global.types';

export default async (): Promise<void> => {
  console.log('\n🧹 Starting global test cleanup...');

  // Close NestJS application first
  const app = (globalThis as ExtraGlobals).__NEST_APP__;
  if (app) {
    try {
      await app.close();
      console.log('🔴 NestJS application closed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log('⚠️ Warning during app close:', errorMessage);
    }
    // Clear the app reference
    delete (globalThis as ExtraGlobals).__NEST_APP__;
  }

  // Close test module (may have Redis connection issues, handle gracefully)
  const testModule = (globalThis as ExtraGlobals).__TEST_MODULE__;
  if (testModule) {
    try {
      await testModule.close();
      console.log('🔴 Test module closed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Redis connections might already be closed, this is expected
      if (
        errorMessage.includes('Connection is closed') ||
        errorMessage.includes('Redis')
      ) {
        console.log('⚠️ Redis connection already closed (expected)');
      } else {
        console.log('⚠️ Warning during test module close:', errorMessage);
      }
    }
    // Clear the test module reference
    delete (globalThis as ExtraGlobals).__TEST_MODULE__;
  }

  // Stop MongoDB instance
  const mongod = (globalThis as ExtraGlobals).__MONGOD__;
  if (mongod) {
    try {
      await mongod.stop();
      console.log('🔴 MongoDB Memory Server stopped');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log('⚠️ Warning during MongoDB stop:', errorMessage);
    }
    // Clear the mongod reference
    delete (globalThis as ExtraGlobals).__MONGOD__;
  }

  // Reset setup completion flag
  delete (globalThis as ExtraGlobals).__SETUP_COMPLETE__;

  console.log('✅ Global test cleanup completed');
};
