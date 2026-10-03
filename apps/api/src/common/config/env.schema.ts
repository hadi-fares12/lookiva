import { z } from 'zod';
const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());


export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PUBLIC_CUSTOMER_WEB_URL: z.string().url().default('http://localhost:3001'),
  PUBLIC_BUSINESS_WEB_URL: z.string().url().default('http://localhost:3002'),

  MINIO_ENDPOINT: z.string().min(1).default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: envBoolean.default(false),
  MINIO_ACCESS_KEY: z.string().min(3).default('lookiva_admin'),
  MINIO_SECRET_KEY: z.string().min(8).default('lookiva_minio_dev'),
  MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must contain at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must contain at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002,http://localhost:3003'),
  PORT: z.coerce.number().int().positive().default(4000),

  SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  EMAIL_PROVIDER: z.enum(['console', 'generic_http']).default('console'),
  EMAIL_PROVIDER_BASE_URL: z.string().url().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('no-reply@lookiva.app'),

  WHATSAPP_PROVIDER: z.enum(['console', 'generic_http']).default('console'),
  WHATSAPP_PROVIDER_BASE_URL: z.string().url().optional(),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_FROM: z.string().optional(),

  PUSH_PROVIDER: z.enum(['console', 'generic_http']).default('console'),
  PUSH_PROVIDER_BASE_URL: z.string().url().optional(),
  PUSH_API_KEY: z.string().optional(),

  ONLINE_PAYMENTS_ENABLED: envBoolean.default(false),
  PAYMENT_PROVIDER: z.enum(['disabled', 'test', 'generic_http']).default('disabled'),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_PROVIDER_BASE_URL: z.string().url().optional(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== 'production') return;

  if (value.SMS_PROVIDER === 'console') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMS_PROVIDER'], message: 'Production OTP requires a real SMS provider' });
  }
  if (value.SMS_PROVIDER === 'twilio' && (!value.TWILIO_ACCOUNT_SID || !value.TWILIO_AUTH_TOKEN || !value.TWILIO_FROM_NUMBER)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TWILIO_ACCOUNT_SID'], message: 'Twilio production credentials are incomplete' });
  }

  if (value.EMAIL_PROVIDER === 'console') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_PROVIDER'], message: 'Production email requires a real provider' });
  }
  if (value.EMAIL_PROVIDER === 'generic_http' && (!value.EMAIL_PROVIDER_BASE_URL || !value.EMAIL_API_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_PROVIDER_BASE_URL'], message: 'Production email provider configuration is incomplete' });
  }

  if (value.PUSH_PROVIDER === 'console') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PUSH_PROVIDER'], message: 'Production push notifications require a real provider' });
  }
  if (value.PUSH_PROVIDER === 'generic_http' && (!value.PUSH_PROVIDER_BASE_URL || !value.PUSH_API_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PUSH_PROVIDER_BASE_URL'], message: 'Production push provider configuration is incomplete' });
  }

  if (!value.MINIO_ENDPOINT || !value.MINIO_ACCESS_KEY || !value.MINIO_SECRET_KEY || !value.MEDIA_PUBLIC_BASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MEDIA_PUBLIC_BASE_URL'], message: 'Production object storage/media public URL configuration is incomplete' });
  }

  if (value.ONLINE_PAYMENTS_ENABLED) {
    if (value.PAYMENT_PROVIDER === 'disabled' || value.PAYMENT_PROVIDER === 'test') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYMENT_PROVIDER'], message: 'A real payment provider is required when online payments are enabled in production' });
    }
    if (!value.PAYMENT_API_KEY || !value.PAYMENT_WEBHOOK_SECRET || !value.PAYMENT_PROVIDER_BASE_URL) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYMENT_API_KEY'], message: 'Production online payment provider credentials are incomplete' });
    }
  }
});

export type EnvSchema = z.infer<typeof envSchema>;
