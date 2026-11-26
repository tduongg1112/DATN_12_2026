import { existsSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../src/config/env.validation.js';
import { configureApp } from '../src/configure-app.js';

/**
 * E2E feature disease_library (UC05, docs/disease_library/api_disease_library.md L1 → L3).
 * Chạy trên PostgreSQL thật (`docker compose up -d`, đã chạy migration).
 *
 * Dữ liệu test riêng: 3 loại cây (2 ACTIVE, 1 HIDDEN), bệnh, nhãn, lượt chẩn đoán, tất cả
 * mang tiền tố của lần chạy và bị xoá ở afterAll. Danh sách luôn lọc theo loại cây test nên
 * không lẫn dữ liệu dev.
 *
 * "Đang phổ biến" là top N trên toàn hệ thống. Để test không phụ thuộc dữ liệu dev, đặt
 * N rất lớn: mọi bệnh có ≥ 1 lượt hợp lệ đều được gắn nhãn. Giới hạn N được unit test
 * ở `disease-trends.query.spec.ts`. Ngưỡng đặt 0.6 cho test biên (testing-rules mục 3).
 */
const RUN = Date.now();
const P = `E2E-LIB ${RUN}`;
const EMAIL = `e2e-lib-${RUN}@example.test`;
const LABEL_PREFIX = `E2E_LIB_${RUN}`;
const DAY = 24 * 60 * 60 * 1000;
const THRESHOLD = 0.6;

const MSG = {
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  INVALID: 'Dữ liệu không hợp lệ',
  UNAUTHORIZED: 'Vui lòng đăng nhập',
};

interface Card {
  id: number;
  name: string;
  crop: { id: number; code: string; name: string };
  severity: string;
  summary: string | null;
  coverImageUrl: string | null;
  trending: boolean;
}

describe('Disease library (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let publicBaseUrl: string;
  let userToken: string;
  let adminToken: string;
  let userId: number;

  const crop = { a: 0, b: 0, hidden: 0 };
  const d: Record<string, number> = {};
  const api = (p: string) => `/api/v1${p}`;
  const get = (p: string, token = userToken) =>
    request(http).get(api(p)).set('Authorization', `Bearer ${token}`);

  async function insertCrop(key: string, status: 'ACTIVE' | 'HIDDEN') {
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO crops (code, name, status) VALUES ($1, $2, $3) RETURNING id`,
      [`E2E${RUN}${key}`, `${P} cây ${key}`, status],
    );
    return Number(row.id);
  }

  async function insertDisease(
    key: string,
    o: {
      cropId: number;
      status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
      featured?: boolean;
      publishedDaysAgo?: number;
      group?: string;
      name?: string;
    },
  ) {
    const name = o.name ?? `${P} ${key}`;
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO diseases (crop_id, name, pathogen, pathogen_group, severity, summary,
         symptoms, causes, prevention, treatment, is_featured, status, published_at)
       VALUES ($1, $2, $3, $4, 'HIGH', $5, 'Triệu chứng',
         NULL, 'Phòng ngừa', 'Xử lý', $6, $7, $8)
       RETURNING id`,
      [
        o.cropId,
        name,
        `Tác nhân ${name}`,
        o.group ?? 'FUNGUS',
        `Tóm tắt ${name}`,
        o.featured ?? false,
        o.status ?? 'PUBLISHED',
        o.publishedDaysAgo === undefined
          ? null
          : new Date(RUN - o.publishedDaysAgo * DAY),
      ],
    );
    d[key] = Number(row.id);
    return d[key];
  }

  /** Một nhãn DISEASE cho bệnh (để đếm "Đang phổ biến"). */
  async function insertLabel(key: string, cropId: number) {
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO model_labels (class_code, label_type, crop_id, disease_id)
       VALUES ($1, 'DISEASE', $2, $3) RETURNING id`,
      [`${LABEL_PREFIX}_${key}`, cropId, d[key]],
    );
    return Number(row.id);
  }

  /** Một lượt chẩn đoán COMPLETED với dự đoán hạng 1 là nhãn `labelId`. */
  async function insertDiagnosis(
    labelId: number,
    o: {
      cropId: number;
      probability: number;
      resultType?: 'DISEASE' | 'HEALTHY' | 'UNCERTAIN';
      daysAgo?: number;
      deleted?: boolean;
    },
  ) {
    const createdAt = new Date(RUN - (o.daysAgo ?? 0) * DAY);
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO diagnoses (user_id, crop_id, original_image_url, processed_image_url,
         status, result_type, model_version, inference_ms, created_at, completed_at, deleted_at)
       VALUES ($1, $2, 'e2e/goc.jpg', 'e2e/chinh.jpg', 'COMPLETED', $3, 'e2e', 10, $4, $4, $5)
       RETURNING id`,
      [
        userId,
        o.cropId,
        o.resultType ?? 'DISEASE',
        createdAt,
        o.deleted ? createdAt : null,
      ],
    );
    await db.query(
      `INSERT INTO diagnosis_predictions (diagnosis_id, label_id, probability, rank_no)
       VALUES ($1, $2, $3, 1)`,
      [Number(row.id), labelId, o.probability],
    );
  }

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    process.env.LIBRARY_TRENDING_LIMIT = '1000';
    process.env.LIBRARY_TRENDING_DAYS = '30';
    process.env.AI_CONFIDENCE_THRESHOLD = String(THRESHOLD);
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    db = app.get(DataSource);
    const config =
      app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
    publicBaseUrl = config
      .get('STORAGE_PUBLIC_BASE_URL', { infer: true })
      .replace(/\/+$/, '');

    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: 'Người Dùng Thư Viện',
        email: EMAIL,
        password: 'matkhau1',
        confirmPassword: 'matkhau1',
      })
      .expect(201);
    userToken = res.body.accessToken as string;
    const jwt = app.get(JwtService);
    userId = Number(jwt.decode<{ sub: number }>(userToken).sub);
    adminToken = await jwt.signAsync(
      { sub: userId, role: 'ADMIN' },
      { secret: config.get('JWT_ACCESS_SECRET', { infer: true }) },
    );

    crop.a = await insertCrop('A', 'ACTIVE');
    crop.b = await insertCrop('B', 'ACTIVE');
    crop.hidden = await insertCrop('H', 'HIDDEN');

    // Loại cây A: thứ tự mong đợi theo BR-03 (nổi bật → đang phổ biến → published_at giảm dần).
    await insertDisease('featured', {
      cropId: crop.a,
      featured: true,
      publishedDaysAgo: 10,
    });
    await insertDisease('trendOld', { cropId: crop.a, publishedDaysAgo: 5 });
    await insertDisease('trendDeleted', {
      cropId: crop.a,
      publishedDaysAgo: 4,
    });
    await insertDisease('newest', {
      cropId: crop.a,
      publishedDaysAgo: 1,
      name: `${P} Bệnh 100% mới`,
    });
    await insertDisease('lowProb', { cropId: crop.a, publishedDaysAgo: 2 });
    await insertDisease('stale', {
      cropId: crop.a,
      publishedDaysAgo: 3,
      group: 'PHYSIOLOGICAL',
    });
    await insertDisease('draft', { cropId: crop.a, status: 'DRAFT' });
    await insertDisease('hidden', {
      cropId: crop.a,
      status: 'HIDDEN',
      publishedDaysAgo: 6,
    });
    // Loại cây B: chỉ một bệnh, cùng nhóm tác nhân với `stale` (BR-07).
    await insertDisease('otherCrop', {
      cropId: crop.b,
      publishedDaysAgo: 1,
      group: 'PHYSIOLOGICAL',
    });
    // Loại cây bị ẩn: bệnh công khai cũng không hiển thị (catalog BR-12).
    await insertDisease('inHiddenCrop', {
      cropId: crop.hidden,
      publishedDaysAgo: 1,
    });

    // Ảnh: `featured` có 2 ảnh (ảnh bìa là sort_order nhỏ nhất); `trendOld` có ảnh ngoài.
    await db.query(
      `INSERT INTO disease_images (disease_id, image_url, caption, sort_order)
       VALUES ($1, 'e2e/sau.jpg', 'Ảnh sau', 1), ($1, 'e2e/bia.jpg', 'Ảnh bìa', 0),
              ($2, 'https://example.test/la.jpg', NULL, 0)`,
      [d.featured, d.trendOld],
    );

    // Lượt chẩn đoán cho BR-04.
    const label = {
      trendOld: await insertLabel('trendOld', crop.a),
      trendDeleted: await insertLabel('trendDeleted', crop.a),
      lowProb: await insertLabel('lowProb', crop.a),
      stale: await insertLabel('stale', crop.a),
      hidden: await insertLabel('hidden', crop.a),
    };
    await insertDiagnosis(label.trendOld, { cropId: crop.a, probability: 0.9 });
    await insertDiagnosis(label.trendOld, {
      cropId: crop.a,
      probability: 0.85,
      daysAgo: 29,
    });
    // Đã xoá mềm vẫn được đếm; xác suất đúng bằng ngưỡng vẫn được đếm (≥).
    await insertDiagnosis(label.trendDeleted, {
      cropId: crop.a,
      probability: THRESHOLD,
      deleted: true,
    });
    // Ngay dưới ngưỡng: không đếm.
    await insertDiagnosis(label.lowProb, {
      cropId: crop.a,
      probability: 0.5999,
    });
    // Quá 30 ngày, hoặc dạng kết quả không phải DISEASE: không đếm.
    await insertDiagnosis(label.stale, {
      cropId: crop.a,
      probability: 0.95,
      daysAgo: 31,
    });
    await insertDiagnosis(label.stale, {
      cropId: crop.a,
      probability: 0.95,
      resultType: 'UNCERTAIN',
    });
    // Bệnh bị ẩn có lượt nhưng không hiển thị.
    await insertDiagnosis(label.hidden, { cropId: crop.a, probability: 0.9 });
  });

  afterAll(async () => {
    if (db) {
      const crops = [crop.a, crop.b, crop.hidden].filter(Boolean);
      await db
        .query(`DELETE FROM diagnoses WHERE user_id = $1`, [userId])
        .catch(() => undefined);
      await db
        .query(`DELETE FROM model_labels WHERE class_code LIKE $1`, [
          `${LABEL_PREFIX}_%`,
        ])
        .catch(() => undefined);
      await db
        .query(`DELETE FROM diseases WHERE crop_id = ANY($1)`, [crops])
        .catch(() => undefined);
      await db
        .query(`DELETE FROM crops WHERE id = ANY($1)`, [crops])
        .catch(() => undefined);
      await db
        .query(`DELETE FROM users WHERE email = $1`, [EMAIL])
        .catch(() => undefined);
    }
    await app?.close();
  });

  // --- Phân quyền -------------------------------------------------------------

  describe('Phân quyền (BR-G03, OQ-22)', () => {
    it.each(['/crops', '/diseases', '/diseases/1'])(
      'chưa đăng nhập gọi %s: 401',
      async (p) => {
        const res = await request(http).get(api(p)).expect(401);
        expect(res.body).toMatchObject({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: MSG.UNAUTHORIZED,
        });
      },
    );

    it('ADMIN dùng được thư viện như USER', async () => {
      await get(`/diseases?cropId=${crop.a}`, adminToken).expect(200);
      await get(`/diseases/${d.featured}`, adminToken).expect(200);
    });
  });

  // --- L1 --------------------------------------------------------------------

  describe('L1 GET /crops (BR-05)', () => {
    it('chỉ loại cây ACTIVE, sắp theo id, chỉ có id, code, name', async () => {
      const res = await get('/crops').expect(200);
      const items = res.body as { id: number; code: string; name: string }[];
      const ids = items.map((c) => c.id);
      expect(ids).toContain(crop.a);
      expect(ids).toContain(crop.b);
      expect(ids).not.toContain(crop.hidden);
      expect(ids).toEqual([...ids].sort((x, y) => x - y));
      expect(Object.keys(items[0]).sort()).toEqual(['code', 'id', 'name']);
    });
  });

  // --- L2 --------------------------------------------------------------------

  describe('L2 GET /diseases (US-01, US-02)', () => {
    it('thứ tự BR-03: nổi bật → đang phổ biến → published_at giảm dần; chỉ bệnh công khai', async () => {
      const res = await get(`/diseases?cropId=${crop.a}`).expect(200);
      const items = res.body.items as Card[];
      expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 6 });
      expect(items.map((c) => c.id)).toEqual([
        d.featured,
        d.trendDeleted,
        d.trendOld,
        d.newest,
        d.lowProb,
        d.stale,
      ]);
    });

    it('BR-04: gắn "Đang phổ biến" đúng lượt hợp lệ (ngưỡng, 30 ngày, DISEASE, gồm cả lượt đã xoá)', async () => {
      const res = await get(`/diseases?cropId=${crop.a}`).expect(200);
      const trending = Object.fromEntries(
        (res.body.items as Card[]).map((c) => [c.id, c.trending]),
      );
      expect(trending).toEqual({
        [d.featured]: false,
        [d.trendOld]: true,
        [d.trendDeleted]: true,
        [d.newest]: false,
        [d.lowProb]: false,
        [d.stale]: false,
      });
    });

    it('thẻ tin đủ trường BR-02; ảnh bìa là sort_order nhỏ nhất, ảnh ngoài giữ nguyên (BR-08, TD-14)', async () => {
      const res = await get(`/diseases?cropId=${crop.a}`).expect(200);
      const byId = new Map(
        (res.body.items as Card[]).map((c) => [c.id, c] as const),
      );
      expect(byId.get(d.featured)).toEqual({
        id: d.featured,
        name: `${P} featured`,
        crop: { id: crop.a, code: `E2E${RUN}A`, name: `${P} cây A` },
        severity: 'HIGH',
        summary: `Tóm tắt ${P} featured`,
        coverImageUrl: `${publicBaseUrl}/e2e/bia.jpg`,
        trending: false,
      });
      expect(byId.get(d.trendOld)?.coverImageUrl).toBe(
        'https://example.test/la.jpg',
      );
      expect(byId.get(d.newest)?.coverImageUrl).toBeNull();
    });

    it('phân trang: trang 2 cỡ 2, total không đổi', async () => {
      const res = await get(
        `/diseases?cropId=${crop.a}&page=2&pageSize=2`,
      ).expect(200);
      expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 6 });
      expect((res.body.items as Card[]).map((c) => c.id)).toEqual([
        d.trendOld,
        d.newest,
      ]);
    });

    it('tìm theo tên không phân biệt hoa thường; % là ký tự thường, không phải ký tự đại diện', async () => {
      const upper = await get(
        `/diseases?cropId=${crop.a}&q=${encodeURIComponent('BỆNH 100% MỚI')}`,
      ).expect(200);
      expect((upper.body.items as Card[]).map((c) => c.id)).toEqual([d.newest]);
      const percent = await get(
        `/diseases?cropId=${crop.a}&q=${encodeURIComponent('%')}`,
      ).expect(200);
      expect((percent.body.items as Card[]).map((c) => c.id)).toEqual([
        d.newest,
      ]);
      const underscore = await get(`/diseases?cropId=${crop.a}&q=_`).expect(
        200,
      );
      expect(underscore.body.total).toBe(0);
    });

    it('BR-11: không có bệnh phù hợp thì danh sách rỗng, total 0', async () => {
      const res = await get(
        `/diseases?cropId=${crop.a}&q=${encodeURIComponent('không có bệnh này')}`,
      ).expect(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it('loại cây bị ẩn hoặc không tồn tại: rỗng, không báo lỗi', async () => {
      for (const cropId of [crop.hidden, 999999999]) {
        const res = await get(`/diseases?cropId=${cropId}`).expect(200);
        expect(res.body).toMatchObject({ items: [], total: 0 });
      }
    });

    it.each([
      ['cropId=abc', 'cropId'],
      ['page=0', 'page'],
      ['pageSize=51', 'pageSize'],
      [`q=${'a'.repeat(101)}`, 'q'],
    ])('tham số sai %s: 400 VALIDATION_ERROR', async (qs, field) => {
      const res = await get(`/diseases?${qs}`).expect(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: MSG.INVALID,
      });
      expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual([
        field,
      ]);
    });
  });

  // --- L3 --------------------------------------------------------------------

  describe('L3 GET /diseases/:id (US-03)', () => {
    it('đủ trường BR-06, ảnh theo sort_order, không lộ trường nội bộ', async () => {
      const res = await get(`/diseases/${d.featured}`).expect(200);
      expect(res.body).toMatchObject({
        id: d.featured,
        name: `${P} featured`,
        pathogen: `Tác nhân ${P} featured`,
        pathogenGroup: 'FUNGUS',
        crop: { id: crop.a, code: `E2E${RUN}A`, name: `${P} cây A` },
        severity: 'HIGH',
        summary: `Tóm tắt ${P} featured`,
        symptoms: 'Triệu chứng',
        causes: null,
        prevention: 'Phòng ngừa',
        treatment: 'Xử lý',
        images: [
          { url: `${publicBaseUrl}/e2e/bia.jpg`, caption: 'Ảnh bìa' },
          { url: `${publicBaseUrl}/e2e/sau.jpg`, caption: 'Ảnh sau' },
        ],
      });
      for (const key of [
        'status',
        'isFeatured',
        'recheckDays',
        'publishedAt',
        'sourceRefs',
      ]) {
        expect(res.body).not.toHaveProperty(key);
      }
    });

    it('BR-07: bệnh liên quan cùng loại cây xếp trước, mới công khai trước, tối đa 4', async () => {
      const res = await get(`/diseases/${d.featured}`).expect(200);
      expect((res.body.related as Card[]).map((c) => c.id)).toEqual([
        d.newest,
        d.lowProb,
        d.stale,
        d.trendDeleted,
      ]);
      expect(res.body.related[0]).toHaveProperty('trending', false);
      expect(res.body.related[3]).toHaveProperty('trending', true);
    });

    it('BR-07: bệnh liên quan khác loại cây khi cùng nhóm tác nhân; không gồm bệnh khác nhóm', async () => {
      const res = await get(`/diseases/${d.otherCrop}`).expect(200);
      const ids = (res.body.related as Card[]).map((c) => c.id);
      expect(ids).toContain(d.stale);
      expect(ids).not.toContain(d.featured);
      expect(ids).not.toContain(d.otherCrop);
    });

    it.each(['draft', 'hidden', 'inHiddenCrop'])(
      'BR-01: bệnh %s không xem được, 404',
      async (key) => {
        const res = await get(`/diseases/${d[key]}`).expect(404);
        expect(res.body).toEqual({
          statusCode: 404,
          code: 'DISEASE_NOT_FOUND',
          message: MSG.NOT_FOUND,
        });
      },
    );

    it('id không tồn tại: 404; id sai định dạng: 400', async () => {
      await get('/diseases/999999999999').expect(404);
      const res = await get('/diseases/abc').expect(400);
      expect(res.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'id', message: MSG.INVALID }],
      });
    });
  });
});
