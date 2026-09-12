import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { RedisIoAdapter } from './common/redis/redis-io.adapter';
import helmet from 'helmet';

async function bootstrap() {
  // ==========================================
  // SECURITY: Validate Critical Environment Variables
  // ==========================================
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    console.error('❌ FATAL ERROR: Missing required environment variables:');
    missingEnvVars.forEach((envVar) => {
      console.error(`   - ${envVar}`);
    });
    console.error(
      '\nPlease set these variables in your .env file or environment.',
    );
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    console.error(
      '❌ FATAL ERROR: JWT_SECRET must be at least 32 characters long for security.',
    );
    console.error('   Current length:', jwtSecret.length);
    console.error('\nGenerate a strong secret with: openssl rand -hex 32\n');
    process.exit(1);
  }

  if (jwtSecret === 'super-secret' || jwtSecret === 'change-me') {
    console.error('❌ FATAL ERROR: JWT_SECRET cannot be a default/weak value.');
    console.error('   Please use a cryptographically secure random string.');
    console.error('\nGenerate one with: openssl rand -hex 32\n');
    process.exit(1);
  }

  console.log('✅ Security: Environment variables validated');

  // ==========================================
  // APPLICATION BOOTSTRAP
  // ==========================================
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // WebSocket Redis Adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Cookie parser
  app.use(cookieParser());

  // Security headers
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
