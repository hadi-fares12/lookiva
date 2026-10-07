import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { applySettingsToProcessEnv } from '@lookiva/shared-config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { I18nService } from 'nestjs-i18n';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { observeRequest } from './common/observability/request-metrics';

applySettingsToProcessEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: false,
    rawBody: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header('x-correlation-id')?.trim();
    const correlationId =
      incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming)
        ? incoming
        : randomUUID();
    res.setHeader('X-Correlation-Id', correlationId);
    const started = process.hrtime.bigint();

    res.on('finish', () => {
      const elapsed =
        Number(process.hrtime.bigint() - started) / 1_000_000;
      observeRequest(req.method, res.statusCode, elapsed);
      logger.log(
        {
          correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Number(elapsed.toFixed(2)),
        },
        'HttpRequest',
      );
    });
    next();
  });

  const configService = app.get(ConfigService);
  const i18nService = app.get(I18nService);

  const corsOrigins = (
    configService.get<string>('CORS_ORIGINS', 'http://localhost:3001,http://localhost:3002,http://localhost:3003')
  )
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Correlation-Id',
      'X-Locale',
      'Accept-Language',
    ],
    exposedHeaders: ['X-Correlation-Id'],
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: configService.get<string>('NODE_ENV') === 'production' ? undefined : false,
  }));

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((error) => {
          if (error.constraints) {
            return Object.values(error.constraints);
          }
          if (error.children && error.children.length > 0) {
            return error.children.flatMap((child) =>
              child.constraints ? Object.values(child.constraints) : [],
            );
          }
          return [`Validation failed for property ${error.property}`];
        });
        return new UnprocessableEntityException(messages);
      },
    }),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter(i18nService));

  const config = new DocumentBuilder()
    .setTitle('LOOKIVA API')
    .setDescription('LOOKIVA Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'bearer',
    )
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Platform', 'Platform settings and configuration')
    .addTag('Geo', 'Geographic data (countries, cities, areas)')
    .addTag('Discovery', 'Search and discovery features')
    .addTag('Businesses', 'Companies and business profiles')
    .addTag('Branches', 'Business branches and locations')
    .addTag('Professionals', 'Staff and professional profiles')
    .addTag('Services', 'Services, categories, and pricing')
    .addTag('Social', 'Social features: posts, likes, comments, follows')
    .addTag('Customers', 'Customer profiles and preferences')
    .addTag('Admin', 'Administrative endpoints')
    .addTag('Media', 'Media upload and management')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = configService.get<number>('PORT') ?? configService.get<number>('API_PORT', 4000);

  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(
    `LOOKIVA API is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  logger.log(
    `Swagger docs available at: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Failed to start LOOKIVA API:', err);
  process.exit(1);
});
