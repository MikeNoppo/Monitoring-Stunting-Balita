import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Cache-Control', /no-store/i)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(typeof res.body.uptimeSeconds).toBe('number');
        expect(typeof res.body.time).toBe('string');
      });
  });
});
