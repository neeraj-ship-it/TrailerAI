<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Stage Project

This repository is a Node.js application built with NestJS(with Fastify), a powerful framework for building scalable and efficient server-side applications. It utilizes various technologies to ensure performance, reliability, and ease of deployment.

## Tech Stack:

- Backend: NestJS with NodeJS environment and Fastify Framework
- Database: MongoDB
- Deployment: AWS
- Testing: Jest
- CI/CD: GitHub Actions

## Project Description

This repository contains a robust backend application developed using NestJS with Fastify, leveraging TypeScript for type-safe coding. The project is designed to handle various business operations and efficiently serve all client requests through modular architecture.

## Project Structure

This project follows a **monolith architecture** using NestJS modules. The structure is organized to facilitate potential future migration to microservices, with clear separation of concerns and shared components.

### Architecture Overview

```
stage-nest-backend/
├── common/              # Shared module (would be part of all microservices)
├── libs/                # Common libraries used across modules
├── src/                 # Application modules (monolith structure)
│   ├── admin/          # Admin management module
│   ├── cms/            # Content Management System module
│   ├── content/        # Content delivery module
│   ├── notification/   # Notification services module
│   ├── payment/         # Payment processing module
│   ├── platform/       # Platform-specific features
│   ├── shared/         # Shared business logic
│   ├── users/          # User management module
│   ├── partner/        # Partner integration module
│   └── app.module.ts   # Root module
├── tests/              # E2E and integration tests
└── dist/               # Compiled output
```

### Directory Details

#### `/common` - Shared Module

The `common` module contains code that would be shared across all microservices if the project is split. This includes:

- **`configs/`** - Application and CMS configuration files
- **`constants/`** - Application-wide constants (app constants, assets, copies, jobs, queues, strings)
- **`dtos/`** - Common Data Transfer Objects (paginated requests/responses, etc.)
- **`entities/`** - Shared database entities (User, Content, Episode, Orders, Plans, Subscriptions, etc.)
- **`enums/`** - Common enumerations (app enums, media enums, common enums)
- **`exceptions/`** - Custom exception classes (Juspay, Paytm, PhonePe)
- **`filters/`** - Global exception filters
- **`helpers/`** - Utility helper functions (dateTime, displaySlug, language, phoneNumber, profile)
- **`interfaces/`** - Shared TypeScript interfaces
- **`localization/`** - Localization files (English, Hindi)
- **`repositories/`** - Base repository classes and shared repositories
- **`schema/`** - Shared Mongoose schemas
- **`utils/`** - Common utility functions (common utils, deeplink parser, env utils, payment utils, etc.)

#### `/libs` - Common Libraries

Reusable libraries that can be imported across modules:

- **`auth/`** - Authentication library
  - Decorators (admin, CMS, context, internal, partner, public)
  - Guards (admin user, auth, CMS auth)
  - JWT service
- **`cache-manager/`** - Cache management service with Redis utilities
- **`error-handler/`** - Centralized error handling service
- **`events/`** - Event tracking services (Amplitude, AppsFlyer, CleverTap, Firebase, RudderStack)
- **`http/`** - HTTP client service wrapper
- **`jobs/`** - Job scheduling service (BullMQ integration)
- **`kafka/`** - Kafka integration service
- **`redis/`** - Redis service with stores (complex Redis, preview content)
- **`repository-cache/`** - Repository-level caching service
- **`storage/`** - Storage service (S3 integration)

#### `/src` - Application Modules

##### **`admin/`** - Admin Management Module

Admin panel functionality for managing the platform:

- **`adminUser/`** - Admin user management (controllers, services, repositories)
- **`content/`** - Admin content management
- **`pg/`** - Payment gateway admin (app settings, mandates)
- **`plans/`** - Plan management
- **`refund/`** - Refund processing

##### **`cms/`** - Content Management System Module

Backend for content creators and administrators:

- **`controllers/`** - CMS API endpoints (artist, content, reels, payment, platter, etc.)
- **`services/`** - CMS business logic services
- **`repositories/`** - CMS data access layer
- **`entities/`** - CMS-specific entities (artist-v1, CMS user, compliance, genres, moods, themes)
- **`dtos/`** - CMS request/response DTOs
- **`workers/`** - Background workers for CMS operations

##### **`content/`** - Content Delivery Module

Handles content delivery to end users:

- **`controllers/`** - Content API endpoints
- **`services/`** - Content business logic (reels, recommendations, content services)
- **`repositories/`** - Content data access
- **`entities/`** - Content-specific entities
- **`consumers/`** - Kafka consumers for content events
- **`workers/`** - Background workers for content processing
- **`seeders/`** - Database seeders for content

##### **`users/`** - User Management Module

User-related functionality:

- **`controllers/`** - User API endpoints
- **`services/`** - User business logic
- **`consumers/`** - Kafka consumers for user events
- **`dtos/`** - User request/response DTOs
- **`interfaces/`** - User-related interfaces

##### **`payment/`** - Payment Processing Module

Payment gateway integrations and transaction management:

- **`controllers/`** - Payment API endpoints
- **`services/`** - Payment processing services
- **`managers/`** - Payment gateway managers
- **`psps/`** - Payment Service Providers (Juspay, Paytm, PhonePe, etc.)
- **`repositories/`** - Payment data access
- **`entities/`** - Payment-related entities
- **`workers/`** - Background workers for payment processing
- **`helpers/`** - Payment utility functions

##### **`notification/`** - Notification Services Module

Multi-channel notification system:

- **`gateways/`** - Notification gateways (email, SMS, push, etc.)
- **`adapters/`** - Notification adapters
- **`services/`** - Notification business logic
- **`templates/`** - Notification templates
- **`interfaces/`** - Notification interfaces

##### **`platform/`** - Platform-Specific Features

Platform-level functionality:

- **`controllers/`** - Platform API endpoints
- **`services/`** - Platform services
- **`repositories/`** - Platform data access

##### **`shared/`** - Shared Business Logic

Business logic shared across multiple modules:

- **`entities/`** - Shared business entities (MandateV2, UserSubscriptionV2, TvDetail)
- **`repositories/`** - Shared repositories
- **`services/`** - Shared services (UserSubscriptionV1/V2 services)

##### **`partner/`** - Partner Integration Module

Third-party partner integrations:

- **`controllers/`** - Partner API endpoints
- **`services/`** - Partner integration services
- **`guards/`** - Partner authentication guards
- **`dtos/`** - Partner request/response DTOs

##### **Root Files**

- **`app.module.ts`** - Root application module (registers all modules)
- **`app.controller.ts`** - Root controller
- **`main.ts`** - Application entry point
- **`cron.worker.ts`** - Cron job worker
- **`integrations.ts`** - Integration configurations

#### `/tests` - Test Suite

E2E and integration tests organized by module:

- **`admin/`** - Admin module tests
- **`cms/`** - CMS module tests
- **`contents/`** - Content module tests
- **`payment/`** - Payment module tests
- **`users/`** - User module tests
- **`seeds/`** - Test data seeders
- **`mocks/`** - Mock responses for external services
- **`utils/`** - Test utilities

### Module Communication

- **Synchronous**: Direct service injection between modules
- **Asynchronous**:
  - **Kafka** - Event-driven communication via Kafka consumers/producers
  - **BullMQ** - Job queues for background processing
  - **Redis** - Caching and pub/sub

### Database & ORM

- **MongoDB** - Primary database (via Mongoose)
- **MikroORM** - Additional ORM for MongoDB entities
- **Redis** - Caching and job queue backend

### Key Technologies

- **NestJS** - Framework
- **Fastify** - HTTP server
- **Mongoose** - MongoDB ODM
- **MikroORM** - TypeScript ORM
- **BullMQ** - Job queue management
- **Kafka** - Event streaming
- **Redis** - Caching and queues
- **Jest** - Testing framework
- **Nestia/Typia** - Runtime type validation and API type generation

### Code Quality & Validation

#### Pre-Commit Hooks

The project uses **Husky** for Git hooks that perform sanity checks before every commit. The pre-commit hook runs the following checks in sequence:

1. **Prettier Format Check** (`format:check`) - Validates code formatting
2. **ESLint Check** (`lint:check`) - Validates code style and best practices
3. **TypeScript Type Check** (`type:check`) - Validates TypeScript types
4. **Build Check** (`build`) - Compiles the project and validates:
   - Nestia/Typia runtime type validations
   - Request/response type safety
   - Build-time type checking

If any check fails, the commit is blocked with a helpful error message. The build process uses **Nestia** and **Typia** to generate runtime validators that ensure type safety for all API requests and responses.

**Location**: `.husky/pre-commit`

#### Base Repository Pattern

All Mongoose and MikroORM repositories extend from `BaseRepository<T>` located in `common/repositories/base.repository.ts`. This base class provides:

**Features:**

- **Type Safety**: Full TypeScript generics support with strict typing for all operations
- **Built-in Caching**: Automatic Redis caching with configurable TTL via `RepositoryCacheService`
- **Projection Support**: Type-safe field projections using TypeScript keyof
- **Pagination**: Built-in paginated queries with `findPaginated()`
- **Cache Management**: Automatic cache invalidation on writes

**Available Methods:**

- `find()` - Find multiple documents with caching support
- `findOne()` - Find single document with caching support
- `findById()` - Find by ID with caching support
- `findPaginated()` - Paginated queries with next page indicator
- `create()` - Create document with optional cache invalidation
- `save()` - Save document
- `updateOne()` - Update single document
- `findByIdAndUpdate()` - Find and update by ID
- `aggregate()` - Aggregation pipeline with caching support
- `findCount()` - Count documents matching filter

**Usage Example:**

```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel);
  }

  // All base methods are available with type safety and caching
  async findActiveUsers() {
    return this.find(
      { isActive: true },
      ['name', 'email'], // Type-safe projections
      { cache: { enabled: true, ttl: 300 } }, // Optional caching
    );
  }
}
```

**Cache Configuration:**

- Cache can be enabled per query via `cache: { enabled: true, ttl?: number }`
- Cache keys are automatically generated based on model name, filter, and projections
- Cache is automatically cleared on document creation/update when `clearCollectionCache: true` is set

#### Error Handler Service

The `ErrorHandlerService` (`libs/error-handler`) provides utility functions for inline error handling across the project, promoting consistent error handling patterns.

**Available Methods:**

- `raiseErrorIfNull<T>(value, exception)` - Throws if value is null/undefined
- `raiseErrorIfNullAsync<T>(value, exception)` - Async version for promises
- `raiseErrorIfFalse(value, exception)` - Throws if value is false
- `raiseErrorIfExistsAsync<T>(value, exception)` - Throws if promise resolves to truthy value
- `try<T, E>(fn, onThrow?)` - Result pattern: returns `[value, undefined]` or `[undefined, error]`

**Error Codes:**
Standardized error codes are defined in `libs/error-handler/src/constants/errorCodes.ts` with corresponding error factory functions in the `Errors` object. This ensures consistent error messages and HTTP status codes across the application.

**Usage Example:**

```typescript
const user = await this.errorHandler.raiseErrorIfNullAsync(
  this.userRepository.findById(userId),
  Errors.USER.USER_NOT_FOUND('User does not exist'),
);
```

#### Global Exception Filter

The `GlobalExceptionFilter` (`common/filters/globalException.filter.ts`) is registered globally in `main.ts` and handles all uncaught exceptions across the application.

**Handled Exception Types:**

- **HttpException** - NestJS HTTP exceptions (4xx, 5xx)
- **TypeGuardError** - Typia validation errors (returns 400 Bad Request)
- **MongooseError** - Database errors
- **AxiosError** - External API errors (returns 502 Bad Gateway)
- **Default** - All other errors (returns 500 Internal Server Error)

**Features:**

- Automatic error logging with appropriate log levels (warn for 4xx, error for 5xx)
- Production-safe error messages (hides stack traces in production)
- Structured error responses with consistent format
- Detailed logging for external API errors (request/response data)

**Error Response Format:**

```typescript
{
  error: string;        // Error type/message
  message?: string;      // Additional details
}
```

The filter is automatically applied to all routes and ensures no unhandled exceptions escape the application, providing a consistent error experience for API consumers.

## Environment Variables:

```bash
PORT: The port on which the application will listen (default: 3020)

NODE_ENV: The application environment (e.g., dev, staging, prod)

MONGO_DB_URI: The connection string for your cloud MongoDB database

```

All of these environment variables and keys will be provided separately via the project maintainer. Please reach out to `#backend_team` for the same.

## Running the Application

# Locally:

1. Installation

```bash
$ npm install
```

2. Running commands

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# debug mode
$ npm run start:debug ( with javascript debug terminal )

# production mode
$ npm run start:prod
```

## Test

Jest is used as the testing framework for this project. Integration tests are located in the test directory. You can run the tests locally using:

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# e2e tests with watch
$ npm run test:e2e:watch

# test coverage
$ npm run test:cov
```

## Recommended Vscode Plugins

```bash
CODESCENE: For code scoring and benchmark tests

Github_Copilot: For personalised code suggestions and improvements

TODO_Highlight: For highlighting the code remarks

```

## CI/CD Workflow

Thiss project uses github actions for basic sanity and build checks when code is pushed to github. Store keys and secrets in repository secrets.

## License

Nest is [MIT licensed](LICENSE).

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest
