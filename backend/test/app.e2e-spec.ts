import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

/**
 * E2E nền: app khởi động với cấu hình thật (.env) và kết nối được PostgreSQL.
 * Cần `docker compose up -d` và `npm run migration:run` trước.
 */
describe('App (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health: app chạy và CSDL trả lời', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('CSDL đã chạy đủ migration (không còn migration chờ)', async () => {
    const dataSource = app.get(DataSource);
    expect(dataSource.isInitialized).toBe(true);
    expect(await dataSource.showMigrations()).toBe(false);
  });

  it('route không tồn tại: 404 đúng dạng lỗi TD-05', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/khong-ton-tai')
      .expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Không tìm thấy dữ liệu',
    });
  });

  it('route ngoài tiền tố /api/v1 không tồn tại', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
