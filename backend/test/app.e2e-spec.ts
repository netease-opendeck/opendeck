import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './app.e2e.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Assistant API')
      .setDescription('助手客户端后端 API 文档')
      .setVersion('0.2')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('/api/docs returns 200', () => {
    return request(app.getHttpServer()).get('/api/docs').expect(200);
  });
});
