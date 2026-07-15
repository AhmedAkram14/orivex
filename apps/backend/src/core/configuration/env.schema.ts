import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().min(1),
  // NOT z.coerce.boolean(): Boolean("false") is true in JS, so coerce.boolean()
  // would treat the literal string "false" from a .env file as enabled.
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().url(),
  // Optional: no code path in this codebase connects to Redis yet (no
  // client is ever instantiated from this value) -- unlike S3 below, which
  // IS actually used by AssetModule's S3ObjectStorageAdapter. Requiring
  // this at boot would fail production deployments that legitimately don't
  // have Redis provisioned yet. Restore to required once it's wired up.
  REDIS_URL: z.string().min(1).optional(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  // MinIO (local dev / self-hosted S3-compatible storage) requires
  // path-style addressing; real AWS S3 does not.
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  // AuthenticationModule (docs/10-backend-architecture.md). Signs/verifies
  // access tokens -- required (no safe default for a signing secret).
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  // argon2id cost parameters (docs/14-adrs.md's "First-Party Authentication"
  // ADR). Defaults follow OWASP's current recommendation; env-overridable so
  // production can tune for its actual hardware without a code change.
  ARGON2_MEMORY_COST_KIB: z.coerce.number().int().positive().default(19_456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}
