import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = new Logger('Bootstrap');

  // Behind a reverse proxy (nginx, Render, Railway, ...) this makes req.ip the real client IP,
  // which the login rate limiter relies on.
  if (process.env.TRUST_PROXY === 'true') {
    (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);
  }

  // Body size: the collect-info form still sends the CV as base64 inside JSON
  // (10 MB file ≈ 13.5 MB base64). Documents use multipart uploads instead.
  const bodyLimit = process.env.JSON_BODY_LIMIT || '15mb';
  app.use(
    express.json({
      limit: bodyLimit,
      // Keep the raw bytes: needed to verify Meta webhook signatures.
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

  // Basic security headers (no extra dependency needed).
  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // CORS: comma-separated list in CORS_ORIGINS, e.g.
  // CORS_ORIGINS=http://localhost:3000,https://ims.nexted.app
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  logger.log(`NestJS backend running on http://localhost:${port}`);
  logger.log(`CORS allowed origins: ${origins.join(', ')}`);
}
bootstrap();
