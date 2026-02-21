import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { existsSync, statSync } from 'fs';
import { AppModule } from './app.module';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global interceptor to transform Decimal to number
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Manage PME API')
    .setDescription('API pour l\'application de gestion de magasin')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // En production (Docker) : servir le frontend buildé depuis /app/client
  // On utilise un middleware en premier pour que GET / et les assets soient servis
  // avant le routeur Nest (sinon Nest renvoie 404 pour GET /).
  const clientPath = join(process.cwd(), 'client');
  if (existsSync(clientPath)) {
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      const pathToTry = req.path === '/' ? 'index.html' : req.path;
      const filePath = resolve(join(clientPath, pathToTry));
      if (!filePath.startsWith(resolve(clientPath))) return next();
      try {
        if (existsSync(filePath) && statSync(filePath).isFile())
          return res.sendFile(filePath);
      } catch {
        // fichier inexistant → SPA fallback
      }
      return res.sendFile(join(clientPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();

