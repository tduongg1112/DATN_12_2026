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
 * E2E feature history (UC03, docs/history/api_history.md H1 → H3, D2 bổ sung `plant`).
 * Chạy trên PostgreSQL thật (`docker compose up -d`, đã chạy migration).
 *
 * Dữ liệu riêng chèn bằng SQL để chủ động thời gian và dạng kết quả: 2 loại cây, 3 bệnh,
 * 4 nhãn, 1 cây, các lượt chẩn đoán của 2 người dùng. Mang tiền tố của lần chạy, xoá ở
 * afterAll. Người dùng mới tạo nên danh sách chỉ gồm lượt của test.
 */
const RUN = Date.now();
const P = `E2E-HIST ${RUN}`;
const EMAIL_PREFIX = `e2e-hist-${RUN}`;
const LP = `E2E_HIST_${RUN}`;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const MSG = {
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  INVALID: 'Dữ liệu không hợp lệ',
  UNAUTHORIZED: 'Vui lòng đăng nhập',
};

interface Item {
  id: number;
  resultType: string;
  createdAt: string;
  thumbnailUrl: string | null;
  crop: { id: number; code: string; name: string };
  plant: { id: number; name: string } | null;
  probability: number;
  disease: { id: number; name: string; severity: string } | null;
}

describe('History (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let publicBaseUrl: string;

  const user = { id: 0, token: '' };
  const other = { id: 0, token: '' };
  const admin = { id: 0, token: '' };
  const crop = { a: 0, b: 0 };
  const disease = { mold: 0, spot: 0 };
  const label = { healthyA: 0, mold: 0, spot: 0 };
  let plantId = 0;
  /** Lượt chẩn đoán theo tên; `at` là thời điểm tạo. */
  const dg: Record<string, { id: number; at: Date }> = {};

  const api = (p: string) => `/api/v1${p}`;
  const list = (qs = '', token = user.token) =>
    request(http)
      .get(api(`/diagnoses${qs ? `?${qs}` : ''}`))
      .set('Authorization', `Bearer ${token}`);
  const post = (path: string, body: unknown, token = user.token) =>
    request(http)
      .post(api(path))
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);
  const ids = (res: request.Response) =>
    (res.body.items as Item[]).map((i) => i.id);

  async function register(key: string) {
    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: `Người Dùng Lịch Sử ${key}`,
        email: `${EMAIL_PREFIX}-${key}@example.test`,
        password: 'matkhau1',
        confirmPassword: 'matkhau1',
      })
      .expect(201);
    const token = res.body.accessToken as string;
    const id = Number(app.get(JwtService).decode<{ sub: number }>(token).sub);
    return { id, token };
  }

  async function insertDiagnosis(
    key: string,
    o: {
      userId?: number;
      cropId?: number;
      status?: 'COMPLETED' | 'FAILED' | 'PROCESSING';
      resultType?: 'DISEASE' | 'HEALTHY' | 'UNCERTAIN';
      ago: number;
      deleted?: boolean;
      plantId?: number;
      top?: [number, number];
    },
  ) {
    const at = new Date(RUN - o.ago);
    const status = o.status ?? 'COMPLETED';
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO diagnoses (user_id, crop_id, plant_id, original_image_url, processed_image_url,
         status, result_type, model_version, inference_ms, created_at, completed_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'e2e', 10, $8, $9, $10) RETURNING id`,
      [
        o.userId ?? user.id,
        o.cropId ?? crop.a,
        o.plantId ?? null,
        `e2e/${key}-goc.jpg`,
        `e2e/${key}.jpg`,
        status,
        status === 'COMPLETED' ? (o.resultType ?? 'DISEASE') : null,
        at,
        status === 'PROCESSING' ? null : at,
        o.deleted ? at : null,
      ],
    );
    const id = Number(row.id);
    if (o.top) {
      await db.query(
        `INSERT INTO diagnosis_predictions (diagnosis_id, label_id, probability, rank_no)
         VALUES ($1, $2, $3, 1)`,
        [id, o.top[0], o.top[1]],
      );
    }
    dg[key] = { id, at };
    return id;
  }

  async function healthOf(id: number) {
    const [row] = await db.query<{ health_status: string }[]>(
      `SELECT health_status FROM plants WHERE id = $1`,
      [id],
    );
    return row.health_status;
  }

  async function deletedAt(id: number) {
    const [row] = await db.query<{ deleted_at: Date | null }[]>(
      `SELECT deleted_at FROM diagnoses WHERE id = $1`,
      [id],
    );
    return row.deleted_at;
  }

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
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

    Object.assign(user, await register('user'));
    Object.assign(other, await register('other'));
    const a = await register('admin');
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [a.id]);
    admin.id = a.id;
    admin.token = await app
      .get(JwtService)
      .signAsync(
        { sub: a.id, role: 'ADMIN' },
        { secret: config.get('JWT_ACCESS_SECRET', { infer: true }) },
      );

    const insertCrop = async (key: string) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO crops (code, name) VALUES ($1, $2) RETURNING id`,
        [`E2EH${RUN}${key}`, `${P} cây ${key}`],
      );
      return Number(row.id);
    };
    crop.a = await insertCrop('A');
    crop.b = await insertCrop('B');

    const insertDisease = async (cropId: number, name: string) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO diseases (crop_id, name, pathogen_group, severity, status, published_at)
         VALUES ($1, $2, 'FUNGUS', 'HIGH', 'PUBLISHED', now()) RETURNING id`,
        [cropId, name],
      );
      return Number(row.id);
    };
    // "%" và "_" trong tên để kiểm tra ô tìm coi chúng là chữ thường.
    disease.mold = await insertDisease(crop.a, `${P} Bệnh mốc 100%`);
    disease.spot = await insertDisease(crop.b, `${P} Bệnh đốm_lá`);

    const insertLabel = async (
      key: string,
      cropId: number,
      diseaseId: number | null,
    ) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO model_labels (class_code, label_type, crop_id, disease_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [`${LP}_${key}`, diseaseId ? 'DISEASE' : 'HEALTHY', cropId, diseaseId],
      );
      return Number(row.id);
    };
    label.healthyA = await insertLabel('healthyA', crop.a, null);
    label.mold = await insertLabel('mold', crop.a, disease.mold);
    label.spot = await insertLabel('spot', crop.b, disease.spot);

    const [plant] = await db.query<{ id: number }[]>(
      `INSERT INTO plants (user_id, crop_id, name, health_status)
       VALUES ($1, $2, $3, 'DISEASED') RETURNING id`,
      [user.id, crop.a, `${P} Cây thử`],
    );
    plantId = Number(plant.id);

    // Lượt hiện trong lịch sử, mới nhất trước: d1 → d2 → d3 → d4.
    await insertDiagnosis('d1', {
      ago: HOUR,
      plantId,
      top: [label.mold, 0.8123],
    });
    await insertDiagnosis('d2', {
      ago: 2 * DAY,
      resultType: 'HEALTHY',
      top: [label.healthyA, 0.9],
    });
    // UNCERTAIN có bệnh mốc ở hạng 1: không được khớp ô tìm (OQ-43).
    await insertDiagnosis('d3', {
      ago: 10 * DAY,
      resultType: 'UNCERTAIN',
      top: [label.mold, 0.41],
    });
    await insertDiagnosis('d4', {
      ago: 20 * DAY,
      cropId: crop.b,
      top: [label.spot, 0.7],
    });
    // Không hiện: FAILED, PROCESSING, đã xoá mềm (BR-01, OQ-23).
    await insertDiagnosis('failed', { ago: 3 * HOUR, status: 'FAILED' });
    await insertDiagnosis('processing', {
      ago: 4 * HOUR,
      status: 'PROCESSING',
    });
    await insertDiagnosis('deleted', {
      ago: 5 * HOUR,
      deleted: true,
      top: [label.mold, 0.9],
    });
    // Lượt của người khác.
    await insertDiagnosis('others', {
      userId: other.id,
      ago: HOUR,
      top: [label.mold, 0.95],
    });
  });

  afterAll(async () => {
    if (db) {
      const users = [user.id, other.id, admin.id].filter(Boolean);
      const run = (sql: string, params: unknown[]) =>
        db.query(sql, params).catch(() => undefined);
      await run(`DELETE FROM diagnoses WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM plants WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM model_labels WHERE class_code LIKE $1`, [
        `${LP}_%`,
      ]);
      await run(`DELETE FROM diseases WHERE crop_id = ANY($1)`, [
        [crop.a, crop.b],
      ]);
      await run(`DELETE FROM crops WHERE id = ANY($1)`, [[crop.a, crop.b]]);
      await run(`DELETE FROM users WHERE email LIKE $1`, [`${EMAIL_PREFIX}-%`]);
    }
    await app?.close();
  });

  // --- Phân quyền -------------------------------------------------------------

  describe('Phân quyền (BR-01, BR-G03, OQ-22)', () => {
    it('chưa đăng nhập: H1, H2, H3 trả 401', async () => {
      for (const send of [
        () => request(http).get(api('/diagnoses')),
        () =>
          request(http)
            .post(api('/diagnoses/delete'))
            .send({ ids: [dg.d1.id] }),
        () =>
          request(http)
            .post(api('/diagnoses/restore'))
            .send({ ids: [dg.d1.id] }),
      ]) {
        const res = await send().expect(401);
        expect(res.body).toMatchObject({
          code: 'UNAUTHORIZED',
          message: MSG.UNAUTHORIZED,
        });
      }
    });

    it('mỗi người chỉ thấy lượt của mình, kể cả ADMIN', async () => {
      expect(ids(await list('', other.token).expect(200))).toEqual([
        dg.others.id,
      ]);
      const adminRes = await list('', admin.token).expect(200);
      expect(adminRes.body).toMatchObject({ items: [], total: 0 });
    });
  });

  // --- H1 ----------------------------------------------------------------------

  describe('H1 GET /diagnoses (US-01, US-02)', () => {
    it('chỉ lượt COMPLETED chưa xoá, mới nhất trước, trang 1 cỡ 20 (BR-01, BR-02)', async () => {
      const res = await list().expect(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 4 });
      expect(ids(res)).toEqual([dg.d1.id, dg.d2.id, dg.d3.id, dg.d4.id]);
    });

    it('đủ trường Bảng 4.6 (DS): ảnh đã chỉnh, loại cây, tên cây, độ tin cậy, bệnh hạng 1', async () => {
      const items = (await list().expect(200)).body.items as Item[];
      const byId = new Map(items.map((i) => [i.id, i] as const));
      expect(byId.get(dg.d1.id)).toEqual({
        id: dg.d1.id,
        resultType: 'DISEASE',
        createdAt: dg.d1.at.toISOString(),
        thumbnailUrl: `${publicBaseUrl}/e2e/d1.jpg`,
        crop: { id: crop.a, code: `E2EH${RUN}A`, name: `${P} cây A` },
        plant: { id: plantId, name: `${P} Cây thử` },
        probability: 0.8123,
        disease: {
          id: disease.mold,
          name: `${P} Bệnh mốc 100%`,
          severity: 'HIGH',
        },
      });
      expect(byId.get(dg.d2.id)).toMatchObject({
        resultType: 'HEALTHY',
        plant: null,
        probability: 0.9,
        disease: null,
      });
      // UNCERTAIN vẫn trả bệnh hạng 1; giao diện không dùng làm tiêu đề (OQ-43).
      expect(byId.get(dg.d3.id)).toMatchObject({
        resultType: 'UNCERTAIN',
        disease: { id: disease.mold },
      });
    });

    it.each([
      ['cropId', () => `cropId=${crop.b}`, () => ['d4']],
      ['resultType', () => 'resultType=HEALTHY', () => ['d2']],
      [
        'from (≥, gồm đúng mốc)',
        () => `from=${encodeURIComponent(dg.d2.at.toISOString())}`,
        () => ['d1', 'd2'],
      ],
      [
        'to (<, không gồm đúng mốc)',
        () => `to=${encodeURIComponent(dg.d2.at.toISOString())}`,
        () => ['d3', 'd4'],
      ],
      [
        'from + to',
        () =>
          `from=${encodeURIComponent(new Date(RUN - 15 * DAY).toISOString())}&to=${encodeURIComponent(new Date(RUN - DAY).toISOString())}`,
        () => ['d2', 'd3'],
      ],
      [
        'from bằng to: rỗng',
        () =>
          `from=${encodeURIComponent(dg.d2.at.toISOString())}&to=${encodeURIComponent(dg.d2.at.toISOString())}`,
        () => [],
      ],
    ])('lọc theo %s (BR-03)', async (_, qs, expected) => {
      const res = await list(qs()).expect(200);
      expect(ids(res)).toEqual(expected().map((k) => dg[k].id));
      expect(res.body.total).toBe(expected().length);
    });

    it('ô tìm: không phân biệt hoa thường, chỉ khớp lượt DISEASE (OQ-43)', async () => {
      const res = await list(`q=${encodeURIComponent('MỐC')}`).expect(200);
      expect(ids(res)).toEqual([dg.d1.id]);
    });

    it('ô tìm: % và _ là ký tự thường', async () => {
      expect(
        ids(await list(`q=${encodeURIComponent('%')}`).expect(200)),
      ).toEqual([dg.d1.id]);
      expect(ids(await list('q=_').expect(200))).toEqual([dg.d4.id]);
    });

    it('phân trang: trang 2 cỡ 2, total không đổi', async () => {
      const res = await list('page=2&pageSize=2').expect(200);
      expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 4 });
      expect(ids(res)).toEqual([dg.d3.id, dg.d4.id]);
    });

    it('không có lượt phù hợp: rỗng, total 0', async () => {
      const res = await list(
        `q=${encodeURIComponent('không có bệnh này')}`,
      ).expect(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it.each([
      ['resultType=FAILED', 'resultType'],
      ['pageSize=51', 'pageSize'],
      ['from=2026-11-23T00:00:00', 'from'],
      [
        `from=${encodeURIComponent('2026-11-23T00:00:00Z')}&to=${encodeURIComponent('2026-11-22T00:00:00Z')}`,
        'to',
      ],
    ])('tham số sai %s: 400 VALIDATION_ERROR', async (qs, field) => {
      const res = await list(qs).expect(400);
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

  // --- D2 bổ sung --------------------------------------------------------------

  describe('D2 GET /diagnoses/:id: trường plant (Bảng 4.6 CT)', () => {
    it('lượt đã gắn cây trả tên cây; chưa gắn trả null', async () => {
      const get = (id: number) =>
        request(http)
          .get(api(`/diagnoses/${id}`))
          .set('Authorization', `Bearer ${user.token}`)
          .expect(200);
      expect((await get(dg.d1.id)).body.plant).toEqual({
        id: plantId,
        name: `${P} Cây thử`,
      });
      expect((await get(dg.d2.id)).body.plant).toBeNull();
    });
  });

  // --- H2, H3 --------------------------------------------------------------------

  describe('H2 xoá, H3 hoàn tác (US-06, BR-08, BR-09, TD-27)', () => {
    const notFound = {
      statusCode: 404,
      code: 'DIAGNOSIS_NOT_FOUND',
      message: MSG.NOT_FOUND,
    };

    it('xoá nhiều mục (id trùng được gộp): 204, biến khỏi danh sách và D2; cây không đổi tình trạng (OQ-24)', async () => {
      await post('/diagnoses/delete', {
        ids: [dg.d1.id, dg.d2.id, dg.d1.id],
      }).expect(204);
      expect(ids(await list().expect(200))).toEqual([dg.d3.id, dg.d4.id]);
      expect(await deletedAt(dg.d1.id)).toBeInstanceOf(Date);
      await request(http)
        .get(api(`/diagnoses/${dg.d2.id}`))
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404);
      expect(await healthOf(plantId)).toBe('DISEASED');
    });

    it('hoàn tác: 204, quay lại danh sách đúng thứ tự; bấm lần nữa không lỗi; cây không đổi', async () => {
      const body = { ids: [dg.d1.id, dg.d2.id] };
      await post('/diagnoses/restore', body).expect(204);
      await post('/diagnoses/restore', body).expect(204);
      expect(ids(await list().expect(200))).toEqual([
        dg.d1.id,
        dg.d2.id,
        dg.d3.id,
        dg.d4.id,
      ]);
      expect(await deletedAt(dg.d1.id)).toBeNull();
      expect(await healthOf(plantId)).toBe('DISEASED');
    });

    it.each([
      ['lẫn lượt của người khác', () => [dg.d3.id, dg.others.id]],
      ['lượt FAILED', () => [dg.failed.id]],
      ['lượt PROCESSING', () => [dg.processing.id]],
      ['lượt đã xoá', () => [dg.deleted.id]],
      ['id không tồn tại', () => [dg.d3.id, 999999999]],
    ])('xoá %s: 404, không xoá gì (tất cả hoặc không)', async (_, idsOf) => {
      const res = await post('/diagnoses/delete', { ids: idsOf() }).expect(404);
      expect(res.body).toEqual(notFound);
      expect(await deletedAt(dg.d3.id)).toBeNull();
      expect(await deletedAt(dg.others.id)).toBeNull();
    });

    it('ADMIN không xoá được lượt của người khác', async () => {
      await post('/diagnoses/delete', { ids: [dg.d3.id] }, admin.token).expect(
        404,
      );
      expect(await deletedAt(dg.d3.id)).toBeNull();
    });

    it.each([
      ['lượt của người khác', () => [dg.others.id]],
      ['lượt FAILED', () => [dg.failed.id]],
    ])('hoàn tác %s: 404', async (_, idsOf) => {
      const res = await post('/diagnoses/restore', { ids: idsOf() }).expect(
        404,
      );
      expect(res.body).toEqual(notFound);
    });

    it.each([
      ['thiếu ids', {}],
      ['mảng rỗng', { ids: [] }],
      [
        'quá 100 phần tử',
        { ids: Array.from({ length: 101 }, (_, i) => i + 1) },
      ],
    ])('%s: 400 VALIDATION_ERROR trường ids', async (_, body) => {
      for (const path of ['/diagnoses/delete', '/diagnoses/restore']) {
        const res = await post(path, body).expect(400);
        expect(res.body).toMatchObject({
          code: 'VALIDATION_ERROR',
          errors: [{ field: 'ids', message: MSG.INVALID }],
        });
      }
    });
  });
});
