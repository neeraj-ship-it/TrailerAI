import { z } from 'zod';

import { CreatePlanDto } from '../dtos/payment.dto';
import {
  PlanTypesEnum,
  PlanCountryEnum,
  PlanStatusEnum,
} from '@app/payment/enums/plan.enum';
import { Paywall, PaywallItemTypeEnum } from 'common/entities/paywall.entity';
import { DayCountEnum, Plan } from 'common/entities/plan.entity';
import {
  Dialect,
  CurrencyEnum,
  CurrencySymbolEnum,
  OS,
  Lang,
} from 'common/enums/app.enum';

const basePlanSchema = z.object({
  actualPrice: z
    .number()
    .positive('Actual price must be a positive number')
    .finite('Actual price must be a finite number'),

  dayCount: z.nativeEnum(DayCountEnum, {
    errorMap: () => ({
      message: 'Day count must be either "default" or "trial"',
    }),
  }),

  payingPrice: z
    .number()
    .positive('Paying price must be a positive number')
    .finite('Paying price must be a finite number'),

  planId: z
    .string()
    .min(1, 'Plan ID is required')
    .max(100, 'Plan ID must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Plan ID can only contain alphanumeric characters, underscores, and hyphens',
    ),

  planType: z.nativeEnum(PlanTypesEnum, {
    errorMap: () => ({
      message: `Plan type must be one of: ${Object.values(PlanTypesEnum).join(', ')}`,
    }),
  }),
});

export const createPlanSchema = basePlanSchema.extend({
  partOfABTestGroup: z.boolean(),
});

export type CreatePlanValidationType = z.infer<typeof createPlanSchema>;

const basePaywallItemSchema = z.object({
  isEnabled: z.boolean().default(true),
  order: z.number().int().min(0, 'Order must be a non-negative integer'),
  type: z.nativeEnum(PaywallItemTypeEnum, {
    errorMap: () => ({
      message: `Type must be one of: ${Object.values(PaywallItemTypeEnum).join(', ')}`,
    }),
  }),
});

const baseMediaPaywallItemSchema = basePaywallItemSchema.extend({
  aspectRatio: z.string().min(1, 'Aspect ratio is required'),
  sourceLink: z.string().min(1, 'Source link is required'),
});

export const buttonPaywallItemSchema = basePaywallItemSchema.extend({
  backgroundColor: z
    .string()
    .min(1, 'Background color is required')
    .default('#FFFFFF'),
  color: z.string().min(1, 'Color is required'),
  fontSize: z
    .number()
    .int()
    .min(1, 'Font size must be greater than 0')
    .default(16),
  fontWeight: z
    .number()
    .int()
    .min(100, 'Font weight must be at least 100')
    .max(900, 'Font weight must be at most 900')
    .default(400),
  label: z.string().min(1, 'Label is required'),
  outlineColor: z.string().min(1, 'Outline color is required'),
  textColor: z.string().min(1, 'Text color is required').default('#000000'),
});

export const mediaImagePaywallItemSchema = baseMediaPaywallItemSchema.extend({
  backgroundColor: z
    .string()
    .min(1, 'Background color is required')
    .default('transparent'),
});

export const mediaVideoPaywallItemSchema = baseMediaPaywallItemSchema.extend({
  autoplay: z.boolean().default(true),
  loop: z.boolean().default(true),
  muted: z.boolean().default(true),
  showControls: z.boolean().default(true),
});

export const publishPlanSchema = basePlanSchema.extend({
  cardOptionen: z.array(z.string()),

  cardOptionhin: z.array(z.string()),

  country: z.nativeEnum(PlanCountryEnum, {
    errorMap: () => ({
      message: `Country must be one of: ${Object.values(PlanCountryEnum).join(', ')}`,
    }),
  }),

  currency: z.nativeEnum(CurrencyEnum, {
    errorMap: () => ({
      message: `Currency must be one of: ${Object.values(CurrencyEnum).join(', ')}`,
    }),
  }),

  currencySymbol: z.nativeEnum(CurrencySymbolEnum, {
    errorMap: () => ({
      message: `Currency symbol must be one of: ${Object.values(CurrencySymbolEnum).join(', ')}`,
    }),
  }),

  discount: z
    .number()
    .min(0, 'Discount must be non-negative')
    .finite('Discount must be a finite number')
    .default(0),

  isRecommended: z.boolean(),

  isRecurring: z.boolean(),

  isTrailPlan: z.boolean(),

  itemId: z
    .string()
    .min(1, 'Item ID is required')
    .max(100, 'Item ID must be less than 100 characters'),

  mediaAssets: z.object({
    [Lang.EN]: z.object({
      buttonItem: buttonPaywallItemSchema,
      footerText: z.string(),
      paywallAssets: z.array(
        z.union([mediaImagePaywallItemSchema, mediaVideoPaywallItemSchema]),
      ),
    }),

    [Lang.HIN]: z.object({
      buttonItem: buttonPaywallItemSchema,
      footerText: z.string(),
      paywallAssets: z.array(
        z.union([mediaImagePaywallItemSchema, mediaVideoPaywallItemSchema]),
      ),
    }),
  }),

  offerTextEn: z.string().min(1, 'Offer text English is required'),

  offerTextHin: z.string().min(1, 'Offer text Hindi is required'),

  os: z.nativeEnum(OS, {
    errorMap: () => ({
      message: `OS must be one of: ${Object.values(OS).join(', ')}`,
    }),
  }),

  paywallId: z.string().min(1, 'Paywall ID is required'),

  planDays: z.string().min(1, 'Plan days is required'),

  planPartOfABTestGroup: z.array(z.string()),

  planTagsEn: z.string(),

  planTagsHin: z.string(),

  planTypeHin: z.string().min(1, 'Plan type Hindi is required'),

  planTypeMode: z.string().min(1, 'Plan type mode is required'),

  planTypeText: z.string().min(1, 'Plan type text is required'),

  planTypeTextHin: z.string().min(1, 'Plan type text Hindi is required'),

  priority: z.number().min(0, 'Priority must be non-negative'),

  saved: z.number(),
  status: z.nativeEnum(PlanStatusEnum, {
    errorMap: () => ({
      message: `Status must be one of: ${Object.values(PlanStatusEnum).join(', ')}`,
    }),
  }),

  subscriptionDate: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid subscription date'),

  subscriptionValid: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .refine(
      (date) => !isNaN(date.getTime()),
      'Invalid subscription valid date',
    ),

  totalCount: z
    .number()
    .int('Total count must be an integer')
    .min(0, 'Total count must be non-negative'),
  totalDays: z
    .number()
    .int('Total days must be an integer')
    .min(0, 'Total days must be non-negative'),
});

export type PublishPlanValidationType = z.infer<typeof publishPlanSchema>;

export const safeValidateCreatePlan = (
  data: CreatePlanDto,
): {
  success: boolean;
  data?: CreatePlanValidationType;
  error?: z.ZodError;
} => {
  const result = createPlanSchema.safeParse(data);

  if (result.success) {
    return { data: result.data, success: true };
  }

  return { error: result.error, success: false };
};

export const safePublishPlan = (
  data: Plan,
): {
  success: boolean;
  data?: PublishPlanValidationType;
  error?: z.ZodError;
} => {
  const result = publishPlanSchema.safeParse(data);

  if (result.success) {
    return { data: result.data, success: true };
  }

  return { error: result.error, success: false };
};

export const createPaywallSchema = z.object({
  buttonPaywallItems: z.array(buttonPaywallItemSchema).optional().default([]),

  mediaImagePaywallItems: z
    .array(mediaImagePaywallItemSchema)
    .optional()
    .default([]),

  mediaVideoPaywallItems: z
    .array(mediaVideoPaywallItemSchema)
    .optional()
    .default([]),

  name: z
    .string()
    .min(1, 'Paywall name is required')
    .max(100, 'Paywall name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s_-]+$/,
      'Paywall name can only contain alphanumeric characters, spaces, underscores, and hyphens',
    ),
});

export type CreatePaywallValidationType = z.infer<typeof createPaywallSchema>;

export const publishPaywallSchema = z.object({
  // buttonPaywallItems: z.array(buttonPaywallItemSchema),

  // mediaImagePaywallItems: z.array(mediaImagePaywallItemSchema),

  // mediaVideoPaywallItems: z.array(mediaVideoPaywallItemSchema),

  name: z
    .string()
    .min(1, 'Paywall name is required')
    .max(100, 'Paywall name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s_-]+$/,
      'Paywall name can only contain alphanumeric characters, spaces, underscores, and hyphens',
    ),
  paywallId: z.string().min(1, 'Paywall ID is required'),
  peripheralImageUrl: z.string().min(1, 'Peripheral image URL is required'),
  targetDialects: z
    .array(z.nativeEnum(Dialect))
    .min(1, 'At least one target dialect is required'),
});

export type PublishPaywallValidationType = z.infer<typeof publishPaywallSchema>;

export const safeValidateCreatePaywall = (
  data: unknown,
): {
  success: boolean;
  data?: CreatePaywallValidationType;
  error?: z.ZodError;
} => {
  const result = createPaywallSchema.safeParse(data);

  if (result.success) {
    return { data: result.data, success: true };
  }

  return { error: result.error, success: false };
};

export const safeValidatePublishPaywall = (
  data: Paywall,
): {
  success: boolean;
  data?: PublishPaywallValidationType;
  error?: z.ZodError;
} => {
  const result = publishPaywallSchema.safeParse(data);

  if (result.success) {
    return { data: result.data, success: true };
  }

  return { error: result.error, success: false };
};
