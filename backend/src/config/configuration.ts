export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE ?? '10485760', 10),
    storagePath: process.env.STORAGE_PATH ?? './uploads',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'noreply@condominium.local',
  },
  morosityCron: {
    enabled: process.env.MOROSITY_CRON_ENABLED !== 'false',
    schedule: process.env.MOROSITY_CRON_SCHEDULE ?? '0 8 * * *',
  },
  appUrl: process.env.APP_URL ?? 'http://localhost:4200',
})
