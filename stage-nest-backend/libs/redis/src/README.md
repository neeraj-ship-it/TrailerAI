# Redis Key Builder Utility

A simple, type-safe utility for building and parsing Redis keys using template patterns.

## 🚀 Features

- **Type-Safe**: Full TypeScript support
- **Template-Based**: Define key patterns once, use everywhere
- **Simple Wildcards**: Use `*` as parameter values for Redis SCAN patterns
- **Bidirectional**: Build keys from parameters and extract parameters from keys

## ⚡ Quick Start

```typescript
import { RedisKeyUtils, RedisKeyTemplate } from '@app/redis';
import { Dialect } from 'common/enums/app.enum';
import { ContentTypeV2 } from 'common/enums/common.enums';

// Build a complete key
const key = RedisKeyUtils.build(RedisKeyTemplate.PREVIEW_CONTENT, {
  dialect: Dialect.ENGLISH,
  type: ContentTypeV2.MOVIE,
  slug: 'avengers',
});
// "preview-content:content:english:movie:avengers"

// Build a pattern for Redis SCAN
const pattern = RedisKeyUtils.getPattern(RedisKeyTemplate.PREVIEW_CONTENT);
// "preview-content:content:*:*:*"

// Parse parameters from a key
const params = RedisKeyUtils.parseKey(
  'preview-content:content:hindi:series:my-show',
  RedisKeyTemplate.PREVIEW_CONTENT,
);
// { dialect: 'hindi', type: 'series', slug: 'my-show' }
```

## 📚 API Reference

### Core Functions

**`build(template, params)`** - Build a key from template and parameters

```typescript
RedisKeyUtils.build(RedisKeyTemplate.PREVIEW_CONTENT, {
  dialect: Dialect.ENGLISH,
  type: ContentTypeV2.MOVIE,
  slug: 'avengers',
});
```

**`parseKey(key, template)`** - Extract parameters from a key

```typescript
RedisKeyUtils.parseKey(
  'preview-content:content:english:movie:avengers',
  RedisKeyTemplate.PREVIEW_CONTENT,
);
```

**`getPattern(template)`** - Get full wildcard pattern for Redis SCAN

```typescript
RedisKeyUtils.getPattern(RedisKeyTemplate.PREVIEW_CONTENT);
// "preview-content:content:*:*:*"
```

### Utility Functions

**`validateKey(key, template)`** - Check if key matches template format
**`getDomain(template)`** - Get first segment of template
**`getParameterNames(template)`** - Get array of parameter names

## 💡 Usage Examples

### Creating Specific Patterns

```typescript
// All English content
const englishOnly = RedisKeyUtils.build(RedisKeyTemplate.PREVIEW_CONTENT, {
  dialect: Dialect.ENGLISH,
  type: '*' as any,
  slug: '*' as any,
});
// "preview-content:content:english:*:*"

// All movies
const moviesOnly = RedisKeyUtils.build(RedisKeyTemplate.PREVIEW_CONTENT, {
  dialect: '*' as any,
  type: ContentTypeV2.MOVIE,
  slug: '*' as any,
});
// "preview-content:content:*:movie:*"
```

### Convenience Builders

```typescript
// Using the convenience methods
const contentKey = RedisKeyBuilders.previewContent.content({
  dialect: Dialect.ENGLISH,
  type: ContentTypeV2.MOVIE,
  slug: 'avengers',
});

const parsed = RedisKeyBuilders.previewContent.parseContentKey(
  'preview-content:content:hindi:series:my-show',
);
```

## ➕ Adding New Templates

1. Add to enum:

```typescript
export enum RedisKeyTemplate {
  PREVIEW_CONTENT = 'preview-content:content:{dialect}:{type}:{slug}',
  NEW_TEMPLATE = 'analytics:{date}:{metric}',
}
```

2. Add to interface:

```typescript
interface KeyParameterMap {
  [RedisKeyTemplate.NEW_TEMPLATE]: {
    date: string;
    metric: string;
  };
}
```

3. Use immediately:

```typescript
const key = RedisKeyUtils.build(RedisKeyTemplate.NEW_TEMPLATE, {
  date: '2024-01-15',
  metric: 'views',
});
```

## 🎯 Best Practices

- Use `getPattern()` for full wildcard Redis SCAN patterns
- Use `build()` with `*` values for selective wildcards
- Use `as any` when passing `*` to bypass TypeScript checking
- Always define parameter types in KeyParameterMap
