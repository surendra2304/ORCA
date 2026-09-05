import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Configure CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.APP_ORIGIN || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3005',
        'http://127.0.0.1:3005',
      ];
      if (!origin || allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-workspace-key', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  const port = parseInt(process.env.PORT || '3005', 10);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
