import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

export enum RedisKeyTemplate {
  PREVIEW_COHORT_USERS = 'preview-content:cohort-users',
  PREVIEW_CONTENT = 'preview-content:content:{dialect}:{type}:{slug}',
  RECOMMENDATION_PANEL = 'recommendation:panel:{dialect}:{userId}',
  RECOMMENDATION_ROW = 'recommendation:row:{rowKey}:{dialect}:{userId}',
  STATSIG_USER = 'statsig-user:v2:{userId}', //'statsig-user:{userId}'
}

interface KeyParameterMap {
  [RedisKeyTemplate.PREVIEW_COHORT_USERS]: Record<string, never>;
  [RedisKeyTemplate.PREVIEW_CONTENT]: {
    slug: string;
    dialect: Dialect;
    type: ContentTypeV2;
  };
  [RedisKeyTemplate.RECOMMENDATION_PANEL]: {
    dialect: Dialect;
    userId: string;
  };
  [RedisKeyTemplate.RECOMMENDATION_ROW]: {
    rowKey: string;
    dialect: Dialect;
    userId: string;
  };
  [RedisKeyTemplate.STATSIG_USER]: {
    userId: string;
  };
}

export const RedisKeyUtils = {
  build<T extends RedisKeyTemplate>(
    template: T,
    params: KeyParameterMap[T],
  ): string {
    let key = template.toString();

    // Replace all placeholders with actual values
    Object.entries(params).forEach(([paramName, value]) => {
      const placeholder = `{${paramName}}`;
      if (!key.includes(placeholder)) {
        throw new Error(
          `Parameter '${paramName}' not found in template: ${template}`,
        );
      }
      key = key.replace(placeholder, String(value));
    });

    // Validate that all placeholders were replaced
    const remainingPlaceholders = key.match(/{[^}]+}/g);
    if (remainingPlaceholders) {
      throw new Error(
        `Missing parameters for template ${template}: ${remainingPlaceholders.join(', ')}`,
      );
    }

    return key;
  },

  getDomain(template: RedisKeyTemplate): string {
    return template.toString().split(':')[0];
  },

  getParameterNames(template: RedisKeyTemplate): string[] {
    const templateString = template.toString();
    const placeholderMatches = templateString.match(/{([^}]+)}/g);

    if (!placeholderMatches) {
      return [];
    }

    return placeholderMatches.map((match) => match.slice(1, -1)); // Remove { and }
  },

  getPartialPattern(template: RedisKeyTemplate, segmentCount: number): string {
    const templateString = template.toString();
    const templateSegments = templateString.split(':');

    if (segmentCount < 1 || segmentCount > templateSegments.length) {
      throw new Error(
        `Segment count ${segmentCount} is out of range. Template has ${templateSegments.length} segments.`,
      );
    }

    const partialSegments = templateSegments
      .slice(0, segmentCount)
      .map((segment) => {
        // Replace parameter placeholders with wildcards
        return segment.replace(/{[^}]+}/g, '*');
      });

    return partialSegments.join(':');
  },

  getPattern(template: RedisKeyTemplate): string {
    return template.toString().replace(/{[^}]+}/g, '*');
  },

  parseKey<T extends RedisKeyTemplate>(
    key: string,
    template: T,
  ): KeyParameterMap[T] {
    const templateString = template.toString();
    const templateSegments = templateString.split(':');
    const keySegments = key.split(':');

    // Validate segment count matches
    if (templateSegments.length !== keySegments.length) {
      throw new Error(
        `Key segment count (${keySegments.length}) doesn't match template segment count (${templateSegments.length}) for template: ${template}`,
      );
    }

    const extractedParams: Record<string, string> = {};

    // Extract parameters from each segment
    templateSegments.forEach((templateSegment, index) => {
      const keySegment = keySegments[index];

      // Check if this segment contains a placeholder
      const placeholderMatch = templateSegment.match(/^{([^}]+)}$/);
      if (placeholderMatch) {
        const paramName = placeholderMatch[1];
        extractedParams[paramName] = keySegment;
      } else {
        // This is a literal segment, it should match exactly
        if (templateSegment !== keySegment) {
          throw new Error(
            `Key segment '${keySegment}' doesn't match template segment '${templateSegment}' at position ${index} for template: ${template}`,
          );
        }
      }
    });

    return extractedParams as KeyParameterMap[T];
  },

  validateKey(key: string, template: RedisKeyTemplate): boolean {
    const pattern = template.toString().replace(/{[^}]+}/g, '[^:]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(key);
  },
} as const;

export const RedisKeyBuilders = {
  previewContent: {
    cohortUsers: () =>
      RedisKeyUtils.build(RedisKeyTemplate.PREVIEW_COHORT_USERS, {}),

    content: ({
      dialect,
      slug,
      type,
    }: {
      slug: string;
      dialect: Dialect;
      type: ContentTypeV2;
    }) =>
      RedisKeyUtils.build(RedisKeyTemplate.PREVIEW_CONTENT, {
        dialect,
        slug,
        type,
      }),

    // Reverse parsers
    parseCohortUsersKey: (key: string) =>
      RedisKeyUtils.parseKey(key, RedisKeyTemplate.PREVIEW_COHORT_USERS),

    parseContentKey: (key: string) =>
      RedisKeyUtils.parseKey(key, RedisKeyTemplate.PREVIEW_CONTENT),
  },
  recommendationRow: {
    panel: ({ dialect, userId }: { dialect: Dialect; userId: string }) =>
      RedisKeyUtils.build(RedisKeyTemplate.RECOMMENDATION_PANEL, {
        dialect,
        userId,
      }),
    row: ({
      dialect,
      rowKey,
      userId,
    }: {
      rowKey: string;
      dialect: Dialect;
      userId: string;
    }) =>
      RedisKeyUtils.build(RedisKeyTemplate.RECOMMENDATION_ROW, {
        dialect,
        rowKey,
        userId,
      }),
  },
  statsigUser: {
    user: (userId: string) =>
      RedisKeyUtils.build(RedisKeyTemplate.STATSIG_USER, { userId }),
  },
} as const;
