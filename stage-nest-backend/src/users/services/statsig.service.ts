import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  Statsig,
  StatsigOptions,
  StatsigUser,
} from '@statsig/statsig-node-core';

import { ExperimentName } from '../dtos/experiment.dto';
import { Errors } from '@app/error-handler/constants/errorCodes';
import { ErrorHandlerService } from '@app/error-handler/errorHandler.service';
import { RedisKeyBuilders } from '@app/redis';
import { RedisService } from '@app/redis/redis.service';
import { APP_CONFIGS } from 'common/configs/app.config';
import { UserSubscriptionHistory } from 'common/entities/userSubscriptionHistory.entity';
import { Dialect } from 'common/enums/app.enum';
import {
  EnvironmentEnum,
  userSubscriptionHistoryStatusEnum,
} from 'common/enums/common.enums';
import { UserRepository } from 'common/repositories/user.repository';
import { UserSubscriptionHistoryRepository } from 'common/repositories/userSubscriptionHistory.repository';
import {
  delay,
  objectToProtobuf,
  protobufToObject,
} from 'common/utils/helpers';
import tracer from 'src/integrations';
import {
  STATSIG_USER_PROPERTY_PROTO_SCHEMA,
  StatsigUserProperty,
  StatsigUserPropertySchemaName,
  StatsigUserPropertySubscriptionStatus,
} from 'src/users/dtos/statsig-user.dto';

@Injectable()
export class StatsigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatsigService.name);

  private statsigClient: Statsig = new Statsig(APP_CONFIGS.STATSIG.API_KEY);
  constructor(
    private readonly errorHandlerService: ErrorHandlerService,
    private readonly redisService: RedisService,
    private readonly userRepository: UserRepository,
    private readonly userSubscriptionHistoryRepository: UserSubscriptionHistoryRepository,
  ) {}

  private async getStatsigUserProperty(userId: string) {
    const user = await this.errorHandlerService.raiseErrorIfNullAsync(
      this.userRepository.findById(userId, ['userCulture']),
      Errors.USER.USER_NOT_FOUND(),
    );

    const {
      latestSubscription,
      paidSubscriptionAge,
      subscriptionAge,
      trialSubscription,
    } =
      await this.userSubscriptionHistoryRepository.getStatsigSubscriptionData(
        userId,
      );

    let subscriptionStatus: StatsigUserPropertySubscriptionStatus =
      StatsigUserPropertySubscriptionStatus.NON_TRIAL;

    subscriptionStatus = this.useSubscriptionStatusToStatSigStatusConverter(
      latestSubscription,
      trialSubscription,
    );

    // Guard ages by current status so inactive users don't carry misleading values
    const isActivePaid =
      subscriptionStatus ===
      StatsigUserPropertySubscriptionStatus.SUBSCRIPTION_ACTIVE;
    const isActiveTrial =
      subscriptionStatus === StatsigUserPropertySubscriptionStatus.TRIAL_ACTIVE;
    const guardedSubscriptionAge =
      isActivePaid || isActiveTrial ? subscriptionAge : -1;
    const guardedPaidSubscriptionAge = isActivePaid ? paidSubscriptionAge : -1;

    const statsigUserProperty: StatsigUserProperty = {
      paid_subscription_age: guardedPaidSubscriptionAge,
      subscription_age: guardedSubscriptionAge,
      subscription_status: subscriptionStatus,
      user_culture: user.userCulture ?? Dialect.HAR,
    };

    return statsigUserProperty;
  }

  private logStatsigMetric(
    method: string,
    userId: string,
    extraTags: Record<string, string | number | boolean> = {},
  ) {
    tracer.dogstatsd.increment('statsig.method.called', 1, {
      method,
      user_id: userId,
      ...extraTags,
    });
  }

  private useSubscriptionStatusToStatSigStatusConverter(
    latestSubscription: Pick<
      UserSubscriptionHistory,
      'status' | 'subscriptionDate' | 'subscriptionValid'
    > | null,
    trialSubscription: Pick<
      UserSubscriptionHistory,
      'status' | 'subscriptionDate' | 'subscriptionValid'
    > | null,
  ): StatsigUserPropertySubscriptionStatus {
    if (!latestSubscription && !trialSubscription) {
      return StatsigUserPropertySubscriptionStatus.NON_TRIAL;
    }

    if (latestSubscription) {
      if (
        latestSubscription.status === userSubscriptionHistoryStatusEnum.ACTIVE
      ) {
        return StatsigUserPropertySubscriptionStatus.SUBSCRIPTION_ACTIVE;
      } else if (
        latestSubscription.status === userSubscriptionHistoryStatusEnum.CANCEL
      ) {
        return StatsigUserPropertySubscriptionStatus.SUBSCRIPTION_EXPIRED;
      }
    }

    if (trialSubscription) {
      if (
        trialSubscription.status === userSubscriptionHistoryStatusEnum.ACTIVE
      ) {
        return StatsigUserPropertySubscriptionStatus.TRIAL_ACTIVE;
      } else if (
        trialSubscription.status === userSubscriptionHistoryStatusEnum.CANCEL
      ) {
        return StatsigUserPropertySubscriptionStatus.TRIAL_EXPIRED;
      }
    }

    return StatsigUserPropertySubscriptionStatus.NON_TRIAL;
  }

  async checkFeatureGate(featureGate: string, userId: string) {
    const user = await this.getStatsigUser(userId);
    const result = await this.statsigClient.checkGate(user, featureGate);
    // this.logStatsigMetric('checkFeatureGate', user.userID ?? '', {
    //   feature_gate: featureGate,
    //   gate_on: result ? 'on' : 'off',
    // });
    return result;
  }

  async deleteStatsigUser(userId: string) {
    const key = RedisKeyBuilders.statsigUser.user(userId);
    await this.redisService.del(key);
  }

  async getExperiment(experiment: ExperimentName, user: StatsigUser) {
    const result = await this.statsigClient.getExperiment(user, experiment);
    this.logStatsigMetric('experiment', user.userID ?? '', {
      experiment,
      variant: result.getGroupName() ?? 'unknown',
    });
    return result;
  }

  async getStatsigUser(userId: string) {
    const key = RedisKeyBuilders.statsigUser.user(userId);
    const storedProtobuf = await this.redisService.get(key);
    if (!storedProtobuf) {
      const statsigUserProperty = await this.getStatsigUserProperty(userId);

      // Store protobuf format
      const buffer = await objectToProtobuf(
        statsigUserProperty as unknown as Record<
          string,
          string | number | boolean
        >,
        STATSIG_USER_PROPERTY_PROTO_SCHEMA,
        StatsigUserPropertySchemaName,
      );
      const protobufBase64 = buffer.toString('base64');
      const protoResult = await this.redisService.set(
        key,
        protobufBase64,
        APP_CONFIGS.CACHE.TTL.ONE_DAY,
      );

      if (!protoResult) {
        this.logger.error(
          `Failed to store statsig user in redis for userId:${userId}`,
        );
      }

      return new StatsigUser({
        custom: statsigUserProperty as unknown as Record<
          string,
          string | number | boolean
        >,
        userID: userId,
      });
    }

    // statsig user property is fetched from redis
    const decodedBuffer = Buffer.from(storedProtobuf, 'base64');
    const decodedProperty = protobufToObject(
      decodedBuffer,
      STATSIG_USER_PROPERTY_PROTO_SCHEMA,
      StatsigUserPropertySchemaName,
    );

    // Ensure numeric fields are properly converted to numbers
    const statsigUserProperty = this.mapToStatsigUserProperty(decodedProperty);

    return new StatsigUser({
      custom: statsigUserProperty as unknown as Record<
        string,
        string | number | boolean
      >,
      userID: userId,
    });
  }

  async init() {
    const result = await this.statsigClient.initialize();
    if (!result.isSuccess) {
      this.logger.error(
        { error: result.error },
        'Failed to initialize Statsig',
      );
      // Don't throw error in development to allow local development without valid Statsig credentials
      if (APP_CONFIGS.IS_PRODUCTION) {
        throw new Error(result.error);
      } else {
        this.logger.warn('Statsig initialization failed in development mode - continuing without Statsig');
      }
    }
  }

  async logEvent(
    event: string,
    userId: string,
    value?: string | number | null,
    metadata?: Record<string, string>,
  ) {
    const user = await this.getStatsigUser(userId);
    return this.statsigClient.logEvent(user, event, value, metadata);
  }

  mapToStatsigUserProperty(
    custom: Partial<
      Record<keyof StatsigUserProperty, string | number | boolean>
    > | null,
  ): StatsigUserProperty {
    return {
      paid_subscription_age: Number(custom?.paid_subscription_age ?? -1),
      subscription_age: Number(custom?.subscription_age ?? -1),
      subscription_status: String(custom?.subscription_status ?? ''),
      user_culture: String(custom?.user_culture ?? ''),
    };
  }

  async onModuleDestroy() {
    if (APP_CONFIGS.IS_TEST) return;
    try {
      return this.statsigClient.shutdown();
    } catch (error) {
      this.logger.warn('Failed to shutdown Statsig client', error);
    }
  }

  async onModuleInit() {
    const options: StatsigOptions = {
      environment: APP_CONFIGS.PLATFORM.IS_PRODUCTION
        ? EnvironmentEnum.PRODUCTION
        : EnvironmentEnum.DEVELOPMENT,
    };
    this.statsigClient = new Statsig(APP_CONFIGS.STATSIG.API_KEY, options);
    await this.init();
  }

  async refreshStatsigUser(userId: string) {
    // this.logStatsigMetric('refreshStatsigUser', userId, { status: 'start' });
    const key = RedisKeyBuilders.statsigUser.user(userId);
    const REFRESH_DELAY_MS = 5000;

    await Promise.all([
      this.redisService.del(key),
      delay(REFRESH_DELAY_MS), // wait for 5 seconds to ensure that user metadata is updated
    ]);

    await this.getStatsigUser(userId);
    // this.logStatsigMetric('refreshStatsigUser', userId, { status: 'success' });
    return true;
  }
}
