import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  NotAcceptableException,
  NotImplementedException,
  ConflictException,
  GoneException,
} from '@nestjs/common';

export const ErrorCodes = {
  ARTIST: {
    ARTIST_NOT_FOUND: 'ARTIST_NOT_FOUND',
  },
  ASSETS: {
    NOT_FOUND: 'ASSETS_NOT_FOUND',
  },
  AUTH: {
    INVALID_AUTH_TOKEN: 'INVALID_AUTH_TOKEN',
    INVALID_CREDENTIAL: 'INVALID_CREDENTIAL',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
  CMS: {
    FFPEG_ERROR: 'FFPEG_ERROR',
    FRAME_EXTRACTION_FAILED: 'FRAME_EXTRACTION_FAILED',
    IMAGE_GENERATION: {
      BASE_IMAGE_DOWNLOAD_FAILED: 'IMAGE_GENERATION_BASE_IMAGE_DOWNLOAD_FAILED',
      GENERATION_FAILED: 'IMAGE_GENERATION_FAILED',
      NO_IMAGE_DATA_FOUND: 'IMAGE_GENERATION_NO_IMAGE_DATA_FOUND',
      NO_IMAGES_PROVIDED: 'IMAGE_GENERATION_NO_IMAGES_PROVIDED',
      UNSUPPORTED_ASPECT_RATIOS: 'IMAGE_GENERATION_UNSUPPORTED_ASPECT_RATIOS',
    },
    INVALID_CONTENT_DATA: 'INVALID_CONTENT_DATA',
    INVALID_CONTENT_STATUS: 'INVALID_CONTENT_STATUS',
    INVALID_PLAN_DATA: 'INVALID_PLAN_DATA',
    NO_CONTENT_FOUND: 'NO_CONTENT_FOUND',
    POSTER_PROJECT: {
      ALREADY_GENERATING: 'POSTER_PROJECT_ALREADY_GENERATING',
      MAX_SIZES_EXCEEDED: 'POSTER_PROJECT_MAX_SIZES_EXCEEDED',
      NOT_FOUND: 'POSTER_PROJECT_NOT_FOUND',
    },
    RAW_MEDIA: {
      NOT_FOUND: 'RAW_MEDIA_NOT_FOUND',
    },
    S3_ERROR: 'S3_ERROR',
    THUMBNAIL_NOT_FOUND: 'THUMBNAIL_NOT_FOUND',
    TRAILER_GENERATION_FAILED: 'TRAILER_GENERATION_FAILED',
    TRAILER_NOT_FOUND: 'TRAILER_NOT_FOUND',
    VIDEO_QC: {
      ALREADY_EXISTS: 'VIDEO_QC_ALREADY_EXISTS',
      CREATION_FAILED: 'VIDEO_QC_CREATION_FAILED',
      LIST_FETCH_FAILED: 'VIDEO_QC_LIST_FETCH_FAILED',
      NOT_FOUND: 'VIDEO_QC_NOT_FOUND',
    },
  },
  CONTENT: {
    ASSETS: {
      NOT_FOUND: 'CONTENT_ASSETS_NOT_FOUND',
    },
    NO_CONTENT_FOUND: 'NO_CONTENT_FOUND',
    ONBOARDING: {
      INVALID_DIALECT: 'ONBOARDING_INVALID_DIALECT',
      STATE_CREATION_FAILED: 'ONBOARDING_STATE_CREATION_FAILED',
      STATE_NOT_FOUND: 'ONBOARDING_STATE_NOT_FOUND',
    },
  },
  CONTENT_PROFILE: {
    INVALID_STATUS: 'INVALID_LIKE_STATUS',
    NOT_FOUND: 'CONTENT_PROFILE_NOT_FOUND',
  },
  COUPON: {
    NOT_FOUND: 'COUPON_NOT_FOUND',
  },
  DEVICE: {
    DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  },
  ENVIRONMENT: {
    NOT_ALLOWED: 'NOT_ALLOWED',
  },
  EPISODE: {
    INVALID_EPISODE_COUNT: 'INVALID_EPISODE_COUNT',
    NOT_FOUND: 'EPISODE_NOT_FOUND',
  },
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  FILE: {
    INVALID_SOURCE_LINK: 'INVALID_SOURCE_LINK',
    INVALID_STATUS: 'INVALID_STATUS',
    INVALID_URL: 'INVALID_URL',
  },
  FUNCTIONALITY_NOT_SUPPORTED: 'FUNCTIONALITY_NOT_SUPPORTED',
  HEADER: {
    MISSING_HEADER: 'MISSING_HEADER',
  },
  JUSPAY: {
    ORDER_ID_REQUIRED: 'JUSPAY_ORDER_ID_REQUIRED',
    ORDER_NOT_FOUND: 'JUSPAY_ORDER_NOT_FOUND',
  },
  MANDATE: {
    ALREADY_EXISTS: 'MANDATE_ALREADY_EXISTS',
    CREATION_FAILED: 'MANDATE_CREATION_FAILED',
    NOT_FOUND: 'MANDATE_NOT_FOUND',
    UPDATE_FAILED: 'MANDATE_UPDATE_FAILED',
  },
  MANDATE_NOTIFICATION: {
    CREATION_FAILED: 'MANDATE_NOTIFICATION_CREATION_FAILED',
    NOT_FOUND: 'MANDATE_NOTIFICATION_NOT_FOUND',
    UPDATE_FAILED: 'MANDATE_NOTIFICATION_UPDATE_FAILED',
  },
  MANDATE_TXN: {
    NOT_FOUND: 'MANDATE_TXN_NOT_FOUND',
  },
  METHOD_NOT_IMPLEMENTED: 'METHOD_NOT_IMPLEMENTED',
  MOVIE: {
    LIST_NOT_FOUND: 'MOVIE_LIST_NOT_FOUND',
    NOT_FOUND: 'MOVIE_NOT_FOUND',
  },
  PARTNER: {
    INVALID_LOGIN_REQUEST: 'INVALID_LOGIN_REQUEST',
    INVALID_LOGIN_SOURCE: 'INVALID_LOGIN_SOURCE',
    INVALID_NUMBER: 'INVALID_NUMBER',
    INVALID_REQUEST: 'INVALID_REQUEST',
  },
  PAYMENT: {
    INVALID_PAYMENT_GATEWAY: 'INVALID_PAYMENT_GATEWAY',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    INVALID_WEBHOOK_PAYLOAD: 'INVALID_WEBHOOK_PAYLOAD',
    SIGNATURE_NOT_FOUND: 'SIGNATURE_NOT_FOUND',
  },
  PAYWALL: {
    ALREADY_EXISTS: 'PAYWALL_ALREADY_EXISTS',
    CREATION_FAILED: 'PAYWALL_CREATION_FAILED',
    ID_REQUIRED: 'PAYWALL_ID_REQUIRED',
    INVALID_STATUS: 'PAYWALL_INVALID_STATUS',
    NOT_FOUND: 'PAYWALL_NOT_FOUND',
    PLAN_ID_REQUIRED: 'PAYWALL_PLAN_ID_REQUIRED',
    STATUS_UPDATE_FAILED: 'PAYWALL_STATUS_UPDATE_FAILED',
    UPDATE_FAILED: 'PAYWALL_UPDATE_FAILED',
  },
  PLAN: {
    ALREADY_ACTIVE: 'PLAN_ALREADY_ACTIVE',
    CANNOT_MIGRATE: 'PLAN_CANNOT_MIGRATE',
    CREATION_FAILED: 'PLAN_CREATION_FAILED',
    INVALID_MANDATE_SETUP_PRICE: 'PLAN_INVALID_MANDATE_SETUP_PRICE',
    INVALID_PAYING_PRICE: 'PLAN_INVALID_PAYING_PRICE',
    NOT_FOUND: 'PLAN_NOT_FOUND',
    STATUS_UPDATE_FAILED: 'PLAN_STATUS_UPDATE_FAILED',
    UPDATE_FAILED: 'PLAN_UPDATE_FAILED',
    VISIBILITY_UPDATE_FAILED: 'PLAN_VISIBILITY_UPDATE_FAILED',
  },
  PLATFORM: {
    TEST_NUMBERS_NOT_AVAILABLE: 'TEST_NUMBERS_NOT_AVAILABLE',
  },
  PLATTER: {
    NOT_FOUND: 'PLATTER_NOT_FOUND',
  },
  RECOMMENDATION: {
    FAILED_TO_GET_PANEL_RECOMMENDATIONS: 'FAILED_TO_GET_PANEL_RECOMMENDATIONS',
  },
  REEL: {
    REEL_NOT_FOUND: 'REEL_NOT_FOUND',
  },
  REFUND: {
    INVALID_AGENT: 'INVALID_AGENT',
    INVALID_TRANSACTION_ID: 'INVALID_TRANSACTION_ID',
    MANDATE_ORDER_ID_REQUIRED: 'MANDATE_ORDER_ID_REQUIRED',
    REFUND_FAILED: 'REFUND_FAILED',
    REFUND_LIMIT_EXCEEDED: 'REFUND_LIMIT_EXCEEDED',
  },
  ROLE: {
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  },
  SETTING: {
    INVALID_PAYMENT_OPTION: 'INVALID_PAYMENT_OPTION',
    INVALID_PG_UPDATE_REQUEST: 'INVALID_PG_UPDATE_REQUEST',
    NOT_FOUND: 'SETTING_NOT_FOUND',
    UPDATE_FAILED: 'SETTING_UPDATE_FAILED',
    USER_CULTURES_NOT_FOUND: 'USER_CULTURES_NOT_FOUND',
  },
  SHOW: {
    EPISODE_IDS_REQUIRED: 'EPISODE_IDS_REQUIRED',
    MICRO_DRAMA_NOT_FOUND: 'MICRO_DRAMA_NOT_FOUND',
    NOT_FOUND: 'SHOW_NOT_FOUND',
  },
  SUBSCRIPTION: {
    HISTORY_NOT_FOUND: 'USER_SUBSCRIPTION_HISTORY_NOT_FOUND',
    NOT_FOUND: 'USER_SUBSCRIPTION_NOT_FOUND',
  },
  USER: {
    MAX_PROFILES_REACHED: 'MAX_PROFILES_REACHED',
    USER_ACCOUNT_INVITE_ALREADY_LINKED: 'USER_ACCOUNT_INVITE_ALREADY_LINKED',
    USER_ACCOUNT_INVITE_NOT_CREATED: 'USER_ACCOUNT_INVITE_NOT_CREATED',
    USER_ACCOUNT_INVITE_NOT_FOUND: 'USER_ACCOUNT_INVITE_NOT_FOUND',
    USER_ACCOUNT_INVITE_NOT_UPDATED: 'USER_ACCOUNT_INVITE_NOT_UPDATED',
    USER_ALREADY_ASSIGNED_FREE_CONTENT: 'USER_ALREADY_ASSIGNED_SPECIAL_ACCESS',
    USER_DATA_NOT_FOUND: 'USER_DATA_NOT_FOUND',
    USER_EVENT_NOT_FOUND: 'USER_EVENT_NOT_FOUND',
    USER_INFO_REQUIRED: 'USER_INFO_REQUIRED',
    USER_META_NOT_FOUND: 'USER_META_NOT_FOUND',
    USER_META_UPDATE_FAIL: 'USER_META_UPDATE_FAIL',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_NOT_SUBSCRIBED: 'USER_NOT_SUBSCRIBED',
    USER_PROFILE_NOT_CREATED: 'USER_PROFILE_CREATION_FAILED',
    USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
    USER_PROFILE_NOT_UPDATED: 'USER_PROFILE_UPDATE_FAILED',
    USER_SPECIAL_STATES_NOT_FOUND: 'USER_SPECIAL_STATES_NOT_FOUND',
  },
  USER_SUBSCRIPTION: {
    EXPIRED: 'USER_SUBSCRIPTION_EXPIRED',
    HISTORY_CREATION_FAILED: 'USER_SUBSCRIPTION_HISTORY_CREATION_FAILED',
    INVALID_STATE: 'USER_SUBSCRIPTION_INVALID_STATE',
    NOT_FOUND: 'USER_SUBSCRIPTION_NOT_FOUND',
    UPDATE_FAILED: 'USER_SUBSCRIPTION_UPDATE_FAILED',
  },
};

export const Errors = {
  ARTIST: {
    ARTIST_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.ARTIST.ARTIST_NOT_FOUND, {
        description,
      }),
  },
  ASSETS: {
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.ASSETS.NOT_FOUND, {
        description,
      }),
  },
  AUTH: {
    INVALID_AUTH_TOKEN: (description?: string) =>
      new ForbiddenException(ErrorCodes.AUTH.INVALID_AUTH_TOKEN, {
        description,
      }),
    INVALID_CREDENTIALS: (description?: string) =>
      new UnauthorizedException(ErrorCodes.AUTH.INVALID_CREDENTIAL, {
        description,
      }),
    UNAUTHORIZED: (description?: string) =>
      new UnauthorizedException(ErrorCodes.AUTH.UNAUTHORIZED, {
        description,
      }),
  },
  CMS: {
    FFMPEG_ERROR: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.CMS.FFPEG_ERROR, {
        description,
      }),
    FRAME_EXTRACTION_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.CMS.FRAME_EXTRACTION_FAILED, {
        description,
      }),
    IMAGE_GENERATION: {
      BASE_IMAGE_DOWNLOAD_FAILED: (description?: string) =>
        new InternalServerErrorException(
          ErrorCodes.CMS.IMAGE_GENERATION.BASE_IMAGE_DOWNLOAD_FAILED,
          { description },
        ),
      GENERATION_FAILED: (description?: string) =>
        new InternalServerErrorException(
          ErrorCodes.CMS.IMAGE_GENERATION.GENERATION_FAILED,
          { description },
        ),
      NO_IMAGE_DATA_FOUND: (description?: string) =>
        new InternalServerErrorException(
          ErrorCodes.CMS.IMAGE_GENERATION.NO_IMAGE_DATA_FOUND,
          { description },
        ),
      NO_IMAGES_PROVIDED: (description?: string) =>
        new BadRequestException(
          ErrorCodes.CMS.IMAGE_GENERATION.NO_IMAGES_PROVIDED,
          { description },
        ),
      UNSUPPORTED_ASPECT_RATIOS: (description?: string) =>
        new BadRequestException(
          ErrorCodes.CMS.IMAGE_GENERATION.UNSUPPORTED_ASPECT_RATIOS,
          { description },
        ),
    },
    INVALID_CONTENT_DATA: (description?: string) =>
      new BadRequestException(ErrorCodes.CMS.INVALID_CONTENT_DATA, {
        description,
      }),
    INVALID_CONTENT_STATUS: (description?: string) =>
      new BadRequestException(ErrorCodes.CMS.INVALID_CONTENT_STATUS, {
        description,
      }),
    INVALID_PLAN_DATA: (description?: string) =>
      new BadRequestException(ErrorCodes.CMS.INVALID_PLAN_DATA, {
        description,
      }),
    NO_CONTENT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.CMS.NO_CONTENT_FOUND, {
        description,
      }),
    POSTER_PROJECT: {
      ALREADY_GENERATING: (description?: string) =>
        new ConflictException(
          ErrorCodes.CMS.POSTER_PROJECT.ALREADY_GENERATING,
          {
            description,
          },
        ),
      MAX_SIZES_EXCEEDED: (description?: string) =>
        new BadRequestException(
          ErrorCodes.CMS.POSTER_PROJECT.MAX_SIZES_EXCEEDED,
          {
            description,
          },
        ),
      NOT_FOUND: (description?: string) =>
        new NotFoundException(ErrorCodes.CMS.POSTER_PROJECT.NOT_FOUND, {
          description,
        }),
    },
    RAW_MEDIA: {
      NOT_FOUND: (description?: string) =>
        new NotFoundException(ErrorCodes.CMS.RAW_MEDIA.NOT_FOUND, {
          description,
        }),
    },
    S3_ERROR: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.CMS.S3_ERROR, {
        description,
      }),
    THUMBNAIL_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.CMS.THUMBNAIL_NOT_FOUND, {
        description,
      }),
    TRAILER_GENERATION_FAILED: (description?: string) =>
      new InternalServerErrorException(
        ErrorCodes.CMS.TRAILER_GENERATION_FAILED,
        {
          description,
        },
      ),
    TRAILER_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.CMS.TRAILER_NOT_FOUND, {
        description,
      }),
    VIDEO_QC: {
      ALREADY_EXISTS: (description?: string) =>
        new ConflictException(ErrorCodes.CMS.VIDEO_QC.ALREADY_EXISTS, {
          description,
        }),
      CREATION_FAILED: (description?: string) =>
        new InternalServerErrorException(
          ErrorCodes.CMS.VIDEO_QC.CREATION_FAILED,
          {
            description,
          },
        ),
      LIST_FETCH_FAILED: (description?: string) =>
        new InternalServerErrorException(
          ErrorCodes.CMS.VIDEO_QC.LIST_FETCH_FAILED,
          {
            description,
          },
        ),
      NOT_FOUND: (description?: string) =>
        new NotFoundException(ErrorCodes.CMS.VIDEO_QC.NOT_FOUND, {
          description,
        }),
    },
  },
  CONTENT: {
    ASSETS: {
      NOT_FOUND: (description?: string) =>
        new NotFoundException(ErrorCodes.CONTENT.ASSETS.NOT_FOUND, {
          description,
        }),
    },
    NO_CONTENT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.CONTENT.NO_CONTENT_FOUND, {
        description,
      }),
    ONBOARDING: {
      INVALID_DIALECT: (description?: string) =>
        new BadRequestException(ErrorCodes.CONTENT.ONBOARDING.INVALID_DIALECT, {
          description,
        }),
      STATE_CREATION_FAILED: (description?: string) =>
        new InternalServerErrorException(
          ErrorCodes.CONTENT.ONBOARDING.STATE_CREATION_FAILED,
          {
            description,
          },
        ),
      STATE_NOT_FOUND: (description?: string) =>
        new NotFoundException(ErrorCodes.CONTENT.ONBOARDING.STATE_NOT_FOUND, {
          description,
        }),
    },
  },
  CONTENT_PROFILE: {
    INVALID_STATUS: (description?: string) =>
      new BadRequestException(ErrorCodes.CONTENT_PROFILE.INVALID_STATUS, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.CONTENT_PROFILE.NOT_FOUND, {
        description,
      }),
  },
  COUPON: {
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.COUPON.NOT_FOUND, {
        description,
      }),
  },
  DEVICE: {
    DEVICE_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.DEVICE.DEVICE_NOT_FOUND, {
        description,
      }),
  },
  ENVIRONMENT: {
    NOT_ALLOWED: (description?: string) =>
      new BadRequestException(ErrorCodes.ENVIRONMENT.NOT_ALLOWED, {
        description,
      }),
  },
  EPISODE: {
    INVALID_EPISODE_COUNT: (description?: string) =>
      new BadRequestException(ErrorCodes.EPISODE.INVALID_EPISODE_COUNT, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.EPISODE.NOT_FOUND, {
        description,
      }),
  },
  EXTERNAL_API_ERROR: (description?: string) =>
    new InternalServerErrorException(ErrorCodes.EXTERNAL_API_ERROR, {
      description,
    }),
  FILE: {
    INVALID_SOURCE_LINK: (description?: string) =>
      new BadRequestException(ErrorCodes.FILE.INVALID_SOURCE_LINK, {
        description,
      }),
    INVALID_STATUS: (description?: string) =>
      new BadRequestException(ErrorCodes.FILE.INVALID_STATUS, {
        description,
      }),
    INVALID_URL: (description?: string) =>
      new BadRequestException(ErrorCodes.FILE.INVALID_URL, {
        description,
      }),
  },
  HEADERS: {
    MISSING_HEADER: (description?: string) =>
      new BadRequestException(ErrorCodes.HEADER.MISSING_HEADER, {
        description,
      }),
  },
  JUSPAY: {
    ORDER_ID_REQUIRED: (description?: string) =>
      new BadRequestException(ErrorCodes.JUSPAY.ORDER_ID_REQUIRED, {
        description,
      }),
    ORDER_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.JUSPAY.ORDER_NOT_FOUND, {
        description,
      }),
  },
  MANDATE: {
    ALREADY_EXISTS: (description?: string) =>
      new BadRequestException(ErrorCodes.MANDATE.ALREADY_EXISTS, {
        description,
      }),
    CREATION_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.MANDATE.CREATION_FAILED, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.MANDATE.NOT_FOUND, {
        description,
      }),
    UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.MANDATE.UPDATE_FAILED, {
        description,
      }),
  },
  MANDATE_NOTIFICATION: {
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.MANDATE_NOTIFICATION.NOT_FOUND, {
        description,
      }),
  },
  MANDATE_TXN: {
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.MANDATE_TXN.NOT_FOUND, {
        description,
      }),
  },
  METHOD_NOT_IMPLEMENTED: (description?: string) => {
    new NotImplementedException(ErrorCodes.METHOD_NOT_IMPLEMENTED, {
      description,
    });
  },
  MOVIE: {
    LIST_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.MOVIE.LIST_NOT_FOUND, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.MOVIE.NOT_FOUND, {
        description,
      }),
  },
  PARTNER: {
    INVALID_LOGIN_REQUEST: (description?: string) =>
      new UnauthorizedException(ErrorCodes.PARTNER.INVALID_LOGIN_REQUEST, {
        description,
      }),
    INVALID_LOGIN_SOURCE: (description?: string) =>
      new BadRequestException(ErrorCodes.PARTNER.INVALID_LOGIN_SOURCE, {
        description,
      }),
    INVALID_NUMBER: (description?: string) =>
      new BadRequestException(ErrorCodes.PARTNER.INVALID_NUMBER, {
        description,
      }),
    INVALID_REQUEST: (description?: string) =>
      new BadRequestException(ErrorCodes.PARTNER.INVALID_REQUEST, {
        description,
      }),
  },
  PAYMENT: {
    INVALID_PAYMENT_GATEWAY: (description?: string) =>
      new BadRequestException(ErrorCodes.PAYMENT.INVALID_PAYMENT_GATEWAY, {
        description,
      }),
    INVALID_SIGNATURE: (description?: string) =>
      new ForbiddenException(ErrorCodes.PAYMENT.INVALID_SIGNATURE, {
        description,
      }),

    INVALID_WEBHOOK_PAYLOAD: (description?: string) =>
      new BadRequestException(ErrorCodes.PAYMENT.INVALID_WEBHOOK_PAYLOAD, {
        description,
      }),
    SIGNATURE_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.PAYMENT.SIGNATURE_NOT_FOUND, {
        description,
      }),
  },
  PAYWALL: {
    ALREADY_EXISTS: (description?: string) =>
      new ConflictException(ErrorCodes.PAYWALL.ALREADY_EXISTS, {
        description,
      }),
    CREATION_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.PAYWALL.CREATION_FAILED, {
        description,
      }),
    ID_REQUIRED: (description?: string) =>
      new BadRequestException(ErrorCodes.PAYWALL.ID_REQUIRED, {
        description,
      }),
    INVALID_STATUS: (description?: string) =>
      new BadRequestException(ErrorCodes.PAYWALL.INVALID_STATUS, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.PAYWALL.NOT_FOUND, {
        description,
      }),
    PLAN_ID_REQUIRED: (description?: string) =>
      new BadRequestException(ErrorCodes.PAYWALL.PLAN_ID_REQUIRED, {
        description,
      }),
    STATUS_UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(
        ErrorCodes.PAYWALL.STATUS_UPDATE_FAILED,
        {
          description,
        },
      ),
    UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.PAYWALL.UPDATE_FAILED, {
        description,
      }),
  },
  PLAN: {
    ALREADY_ACTIVE: (description?: string) =>
      new BadRequestException(ErrorCodes.PLAN.ALREADY_ACTIVE, {
        description,
      }),
    CANNOT_MIGRATE: (description?: string) =>
      new BadRequestException(ErrorCodes.PLAN.CANNOT_MIGRATE, {
        description,
      }),
    CREATION_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.PLAN.CREATION_FAILED, {
        description,
      }),
    INVALID_MANDATE_SETUP_PRICE: (description?: string) =>
      new BadRequestException(ErrorCodes.PLAN.INVALID_MANDATE_SETUP_PRICE, {
        description,
      }),
    INVALID_PAYING_PRICE: (description?: string) =>
      new BadRequestException(ErrorCodes.PLAN.INVALID_PAYING_PRICE, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.PLAN.NOT_FOUND, {
        description,
      }),
    STATUS_UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.PLAN.STATUS_UPDATE_FAILED, {
        description,
      }),
    UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.PLAN.UPDATE_FAILED, {
        description,
      }),
    VISIBILITY_UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(
        ErrorCodes.PLAN.VISIBILITY_UPDATE_FAILED,
        {
          description,
        },
      ),
  },
  PLATFORM: {
    TEST_NUMBERS_NOT_AVAILABLE: (description?: string) =>
      new NotFoundException(ErrorCodes.PLATFORM.TEST_NUMBERS_NOT_AVAILABLE, {
        description,
      }),
  },
  PLATTER: {
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.PLATTER.NOT_FOUND, {
        description,
      }),
  },
  RECOMMENDATION: {
    FAILED_TO_GET_PANEL_RECOMMENDATIONS: (description?: string) =>
      new NotFoundException(
        ErrorCodes.RECOMMENDATION.FAILED_TO_GET_PANEL_RECOMMENDATIONS,
        { description },
      ),
  },
  REEL: {
    REEL_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.REEL.REEL_NOT_FOUND, {
        description,
      }),
  },
  REFUND: {
    INVALID_AGENT: (description?: string) =>
      new BadRequestException(ErrorCodes.REFUND.INVALID_AGENT, {
        description,
      }),
    INVALID_TRANSACTION_ID: (description?: string) =>
      new BadRequestException(ErrorCodes.REFUND.INVALID_TRANSACTION_ID, {
        description,
      }),
    MANDATE_ORDER_ID_REQUIRED: (description?: string) =>
      new BadRequestException(ErrorCodes.REFUND.MANDATE_ORDER_ID_REQUIRED, {
        description,
      }),
    REFUND_FAILED: (failureMessage?: string) =>
      new BadRequestException({
        message: {
          failureMessage,
          refunded: false,
        },
      }),

    REFUND_LIMIT_EXCEEDED: (description?: string) =>
      new BadRequestException(ErrorCodes.REFUND.REFUND_LIMIT_EXCEEDED, {
        description,
      }),
  },
  ROLE: {
    ROLE_NOT_FOUND: (description?: string) =>
      new UnauthorizedException(ErrorCodes.ROLE.ROLE_NOT_FOUND, {
        description,
      }),
  },
  SETTING: {
    INVALID_PAYMENT_OPTION: (description?: string) =>
      new NotFoundException(ErrorCodes.SETTING.INVALID_PAYMENT_OPTION, {
        description,
      }),
    INVALID_PG_UPDATE_REQUEST: (description?: string) =>
      new NotFoundException(ErrorCodes.SETTING.INVALID_PG_UPDATE_REQUEST, {
        description,
      }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.SETTING.NOT_FOUND, {
        description,
      }),
    UPDATE_FAILED: (description?: string) =>
      new NotFoundException(ErrorCodes.SETTING.NOT_FOUND, {
        description,
      }),
    USER_CULTURES_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.SETTING.USER_CULTURES_NOT_FOUND, {
        description,
      }),
  },

  SHOW: {
    EPISODE_IDS_REQUIRED: (description?: string) =>
      new BadRequestException(ErrorCodes.SHOW.EPISODE_IDS_REQUIRED, {
        description,
      }),
    MICRO_DRAMA_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.SHOW.MICRO_DRAMA_NOT_FOUND, {
        description,
      }),
    MOVIE: {
      NOT_FOUND: (description?: string) =>
        new NotFoundException(ErrorCodes.MOVIE.NOT_FOUND, {
          description,
        }),
    },
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.SHOW.NOT_FOUND, {
        description,
      }),
  },
  SUBSCRIPTION: {
    EXPIRED: (description?: string) => ({
      code: ErrorCodes.USER_SUBSCRIPTION.EXPIRED,
      description,
    }),
    HISTORY_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.SUBSCRIPTION.HISTORY_NOT_FOUND, {
        description,
      }),

    INVALID_STATE: (description?: string) => ({
      code: ErrorCodes.USER_SUBSCRIPTION.INVALID_STATE,
      description,
    }),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.SUBSCRIPTION.NOT_FOUND, {
        description,
      }),
  },
  UNSUPPORTED_FUNCTIONALITY: (description?: string) => {
    new NotAcceptableException(ErrorCodes.FUNCTIONALITY_NOT_SUPPORTED, {
      description,
    });
  },
  USER: {
    MAX_PROFILES_REACHED: (maxProfiles: number) =>
      new BadRequestException(ErrorCodes.USER.MAX_PROFILES_REACHED, {
        description: `Maximum limit of ${maxProfiles} profiles reached`,
      }),
    USER_ACCOUNT_INVITE_ALREADY_LINKED: (description?: string) =>
      new ConflictException(
        ErrorCodes.USER.USER_ACCOUNT_INVITE_ALREADY_LINKED,
        {
          description,
        },
      ),
    USER_ACCOUNT_INVITE_NOT_CREATED: (description?: string) =>
      new ConflictException(ErrorCodes.USER.USER_ACCOUNT_INVITE_NOT_CREATED, {
        description,
      }),
    USER_ACCOUNT_INVITE_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_ACCOUNT_INVITE_NOT_FOUND, {
        description,
      }),
    USER_ACCOUNT_INVITE_NOT_UPDATED: (description?: string) =>
      new ConflictException(ErrorCodes.USER.USER_ACCOUNT_INVITE_NOT_UPDATED, {
        description,
      }),
    USER_ALREADY_ASSIGNED_FREE_CONTENT: (description?: string) =>
      new BadRequestException(
        ErrorCodes.USER.USER_ALREADY_ASSIGNED_FREE_CONTENT,
        {
          description,
        },
      ),
    USER_DATA_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_DATA_NOT_FOUND, {
        description,
      }),
    USER_EVENT_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_EVENT_NOT_FOUND, {
        description,
      }),
    USER_INFO_REQUIRED: (description?: string) =>
      new BadRequestException(ErrorCodes.USER.USER_INFO_REQUIRED, {
        description,
      }),
    USER_META_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_META_NOT_FOUND, {
        description,
      }),
    USER_META_UPDATE_FAIL: (description?: string) =>
      new InternalServerErrorException(ErrorCodes.USER.USER_META_NOT_FOUND, {
        description,
      }),
    USER_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_NOT_FOUND, {
        description,
      }),
    USER_NOT_SUBSCRIBED: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_NOT_SUBSCRIBED, {
        description,
      }),
    USER_PROFILE_NOT_CREATED: (description?: string) =>
      new ConflictException(ErrorCodes.USER.USER_PROFILE_NOT_CREATED, {
        description,
      }),
    USER_PROFILE_NOT_FOUND: (description?: string) =>
      new GoneException(ErrorCodes.USER.USER_PROFILE_NOT_FOUND, {
        description,
      }),
    USER_PROFILE_NOT_UPDATED: (description?: string) =>
      new ConflictException(ErrorCodes.USER.USER_PROFILE_NOT_UPDATED, {
        description,
      }),
    USER_SPECIAL_STATES_NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER.USER_SPECIAL_STATES_NOT_FOUND, {
        description,
      }),
  },
  USER_SUBSCRIPTION: {
    HISTORY_CREATION_FAILED: (description?: string) =>
      new InternalServerErrorException(
        ErrorCodes.USER_SUBSCRIPTION.HISTORY_CREATION_FAILED,
        {
          description,
        },
      ),
    NOT_FOUND: (description?: string) =>
      new NotFoundException(ErrorCodes.USER_SUBSCRIPTION.NOT_FOUND, {
        description,
      }),
    UPDATE_FAILED: (description?: string) =>
      new InternalServerErrorException(
        ErrorCodes.USER_SUBSCRIPTION.UPDATE_FAILED,
        {
          description,
        },
      ),
  },
};
