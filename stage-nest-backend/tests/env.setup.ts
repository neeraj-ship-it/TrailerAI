// Environment setup for tests - must be imported first
import 'tsconfig-paths/register';

// Set NODE_ENV to test to prevent production configurations
process.env.NODE_ENV = 'test';

// Set a valid MongoDB URI to pass Zod validation, will be overridden in global setup
process.env.MONGO_DB_URI =
  process.env.MONGO_DB_URI || 'mongodb://localhost:27017/test_temp_db';

// Set EKS_URL to enable secondary connection in tests (uses same test DB)
process.env.MONGO_DB_URI_EKS =
  process.env.MONGO_DB_URI_EKS || 'mongodb://localhost:27017/test_temp_db_eks';

// Disable Kafka partitioner warning in tests
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
