import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { LocalDiskStorage } from '../src/common/storage/local-disk.storage.js';
import { StorageService } from '../src/common/storage/storage.service.js';
import {
  validateEnv,
  type EnvironmentVariables,
} from '../src/config/env.validation.js';
import { configureApp } from '../src/configure-app.js';
import {
  AiClient,
  type AiPredictInput,
  type AiPredictResult,
} from '../src/modules/diagnosis/ai/ai-client.js';

/**
 * E2E feature my_plants đợt 1 (UC04; docs/my_plants/api_my_plants.md P1 → P7, A1, A2, D1
 * `plantId`). Chạy trên PostgreSQL thật (đã chạy migration).
 *
 * - AI giả để D1 ra đúng nhãn cần. Ảnh lưu ở thư mục tạm, xoá ở afterAll.
 * - Dữ liệu riêng: 3 loại cây (2 ACTIVE, 1 HIDDEN), 1 bệnh, 2 nhãn, 3 người dùng. Lượt chẩn
 *   đoán chèn bằng SQL để chủ động thời gian. Mang tiền tố của lần chạy, xoá ở afterAll.
 */
const RUN = Date.now();
const P = `E2E-PLANT ${RUN}`;
const EMAIL_PREFIX = `e2e-plant-${RUN}`;
const LP = `E2E_PLANT_${RUN}`;
const HOUR = 60 * 60 * 1000;

const MSG = {
  REQUIRED: 'Vui lòng nhập tên gọi và chọn loại cây',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  INVALID: 'Dữ liệu không hợp lệ',
  IMAGE: 'Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB',
  STATUS: 'Không thể chuyển sang tình trạng này',
  LINKED: 'Lần tra cứu này đã được lưu vào hồ sơ cây',
  CONTENT: 'Vui lòng nhập nội dung ghi chú',
};

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 2]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 3, 3]);
const GIF = Buffer.from('GIF89a-khong-phai-anh-hop-le');

class FakeAiClient extends AiClient {
  classCode = '';
  predict(_input: AiPredictInput): Promise<AiPredictResult> {
    return Promise.resolve({
      modelVersion: 'e2e-1',
      inferenceMs: 5,
      predictions: [{ classCode: this.classCode, probability: 0.9 }],
    });
  }
  getLabels(): Promise<string[]> {
    return Promise.resolve([]);
  }
}

describe('My plants (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let uploadDir: string;
  const ai = new FakeAiClient();

  const user = { id: 0, token: '' };
  const other = { id: 0, token: '' };
  const admin = { id: 0, token: '' };
  const crop = { a: 0, b: 0, hidden: 0 };
  const label = { healthyA: 0, mold: 0 };
  let moldId = 0;

  const api = (p: string) => `/api/v1${p}`;
  const auth = (req: request.Test, token = user.token) =>
    req.set('Authorization', `Bearer ${token}`);
  const get = (p: string, token = user.token) =>
    auth(request(http).get(api(p)), token);
  const postJson = (p: string, body: object, token = user.token) =>
    auth(request(http).post(api(p)), token).send(body);

  /** P2 hoặc A2 qua multipart. */
  function postPlant(
    fields: Record<string, string | number>,
    o: { avatar?: Buffer; path?: string; token?: string } = {},
  ) {
    let req = auth(request(http).post(api(o.path ?? '/plants')), o.token);
    for (const [k, v] of Object.entries(fields)) req = req.field(k, String(v));
    if (o.avatar) {
      req = req.attach('avatar', o.avatar, {
        filename: 'cay.jpg',
        contentType: 'image/jpeg',
      });
    }
    return req;
  }

  async function register(key: string) {
    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: `Người Dùng Cây ${key}`,
        email: `${EMAIL_PREFIX}-${key}@example.test`,
        password: 'matkhau1',
        confirmPassword: 'matkhau1',
      })
      .expect(201);
    const token = res.body.accessToken as string;
    const id = Number(app.get(JwtService).decode<{ sub: number }>(token).sub);
    return { id, token };
  }

  /** Cây chèn bằng SQL để chủ động tình trạng và thời điểm tạo. */
  async function insertPlant(
    name: string,
    o: {
      userId?: number;
      cropId?: number;
      health?: string;
      createdAgo?: number;
    } = {},
  ) {
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO plants (user_id, crop_id, name, health_status, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        o.userId ?? user.id,
        o.cropId ?? crop.a,
        `${P} ${name}`,
        o.health ?? 'NOT_DIAGNOSED',
        new Date(RUN - (o.createdAgo ?? 0)),
      ],
    );
    return Number(row.id);
  }

  /** Lượt COMPLETED có dự đoán hạng 1 là `labelId`. */
  async function insertDiagnosis(o: {
    userId?: number;
    plantId?: number | null;
    resultType: 'DISEASE' | 'HEALTHY' | 'UNCERTAIN';
    labelId: number;
    ago?: number;
    deleted?: boolean;
  }) {
    const at = new Date(Date.now() - (o.ago ?? 0));
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO diagnoses (user_id, crop_id, plant_id, original_image_url, processed_image_url,
         status, result_type, model_version, inference_ms, created_at, completed_at, deleted_at)
       VALUES ($1, $2, $3, 'e2e/g.jpg', 'e2e/c.jpg', 'COMPLETED', $4, 'e2e', 5, $5, $5, $6)
       RETURNING id`,
      [
        o.userId ?? user.id,
        crop.a,
        o.plantId ?? null,
        o.resultType,
        at,
        o.deleted ? at : null,
      ],
    );
    const id = Number(row.id);
    await db.query(
      `INSERT INTO diagnosis_predictions (diagnosis_id, label_id, probability, rank_no)
       VALUES ($1, $2, 0.9, 1)`,
      [id, o.labelId],
    );
    return id;
  }

  async function plantRow(id: number) {
    const [row] = await db.query<Record<string, unknown>[]>(
      `SELECT * FROM plants WHERE id = $1`,
      [id],
    );
    return row;
  }

  async function diagnosisPlantId(id: number) {
    const [row] = await db.query<{ plant_id: number | null }[]>(
      `SELECT plant_id FROM diagnoses WHERE id = $1`,
      [id],
    );
    return row.plant_id === null ? null : Number(row.plant_id);
  }

  const stored = (key: unknown) =>
    existsSync(path.join(uploadDir, String(key)));

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const env = validateEnv(process.env);
    const { AppModule } = await import('../src/app.module.js');
    uploadDir = await mkdtemp(path.join(os.tmpdir(), 'e2e-plant-uploads-'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiClient)
      .useValue(ai)
      .overrideProvider(StorageService)
      .useValue(
        new LocalDiskStorage({
          rootDir: uploadDir,
          publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
          maxBytes: env.STORAGE_MAX_BYTES,
        }),
      )
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    db = app.get(DataSource);
    const config =
      app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

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

    const insertCrop = async (key: string, status: string) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO crops (code, name, status) VALUES ($1, $2, $3) RETURNING id`,
        [`E2EP${RUN}${key}`, `${P} cây ${key}`, status],
      );
      return Number(row.id);
    };
    crop.a = await insertCrop('A', 'ACTIVE');
    crop.b = await insertCrop('B', 'ACTIVE');
    crop.hidden = await insertCrop('H', 'HIDDEN');

    const [d] = await db.query<{ id: number }[]>(
      `INSERT INTO diseases (crop_id, name, pathogen_group, severity, treatment, status, published_at)
       VALUES ($1, $2, 'FUNGUS', 'HIGH', 'Xử lý 1', 'PUBLISHED', now()) RETURNING id`,
      [crop.a, `${P} Bệnh mốc`],
    );
    moldId = Number(d.id);
    const insertLabel = async (key: string, diseaseId: number | null) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO model_labels (class_code, label_type, crop_id, disease_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [`${LP}_${key}`, diseaseId ? 'DISEASE' : 'HEALTHY', crop.a, diseaseId],
      );
      return Number(row.id);
    };
    label.healthyA = await insertLabel('healthyA', null);
    label.mold = await insertLabel('mold', moldId);
  });

  afterAll(async () => {
    if (db) {
      const users = [user.id, other.id, admin.id].filter(Boolean);
      const crops = [crop.a, crop.b, crop.hidden].filter(Boolean);
      const run = (sql: string, params: unknown[]) =>
        db.query(sql, params).catch(() => undefined);
      await run(`DELETE FROM notifications WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM diagnoses WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM plants WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM model_labels WHERE class_code LIKE $1`, [
        `${LP}_%`,
      ]);
      await run(`DELETE FROM diseases WHERE crop_id = ANY($1)`, [crops]);
      await run(`DELETE FROM crops WHERE id = ANY($1)`, [crops]);
      await run(`DELETE FROM users WHERE email LIKE $1`, [`${EMAIL_PREFIX}-%`]);
    }
    await app?.close();
    if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  });

  // --- Phân quyền -------------------------------------------------------------

  describe('Phân quyền (BR-13, OQ-22)', () => {
    it('chưa đăng nhập: 401', async () => {
      await request(http).get(api('/plants')).expect(401);
      await request(http).get(api('/plants/1')).expect(401);
    });

    it('cây của người khác: 404 PLANT_NOT_FOUND ở mọi thao tác, kể cả ADMIN', async () => {
      const id = await insertPlant('của người khác', { userId: other.id });
      const notFound = {
        statusCode: 404,
        code: 'PLANT_NOT_FOUND',
        message: MSG.NOT_FOUND,
      };
      for (const res of [
        await get(`/plants/${id}`).expect(404),
        await get(`/plants/${id}`, admin.token).expect(404),
        await auth(request(http).patch(api(`/plants/${id}`)))
          .field('name', 'X')
          .expect(404),
        await auth(request(http).delete(api(`/plants/${id}`))).expect(404),
        await postJson(`/plants/${id}/status`, { status: 'RECOVERED' }).expect(
          404,
        ),
        await auth(request(http).post(api(`/plants/${id}/logs`)))
          .field('content', 'X')
          .expect(404),
      ]) {
        expect(res.body).toEqual(notFound);
      }
      expect((await plantRow(id)).name).toBe(`${P} của người khác`);
    });
  });

  // --- P2, P3 -----------------------------------------------------------------

  describe('P2 thêm cây, P3 chi tiết (US-02, US-03; BR-02, 03, 05)', () => {
    it('thêm đủ trường kèm ảnh: 201, "Chưa chẩn đoán", chi tiết rỗng', async () => {
      const res = await postPlant(
        {
          name: '  Cà chua ban công ',
          cropId: crop.a,
          plantedDate: '2026-10-01',
          note: 'Chậu số 2',
        },
        { avatar: JPG },
      ).expect(201);
      expect(res.body).toEqual({
        plant: {
          id: expect.any(Number),
          name: 'Cà chua ban công',
          crop: { id: crop.a, code: `E2EP${RUN}A`, name: `${P} cây A` },
          plantedDate: '2026-10-01',
          note: 'Chậu số 2',
          avatarUrl: expect.stringMatching(/\/plants\/\d{4}\/\d{2}\/.+\.jpg$/),
          healthStatus: 'NOT_DIAGNOSED',
          allowedStatusChanges: [],
          createdAt: expect.any(String),
          lastDiagnosedAt: null,
          currentDisease: null,
          diagnoses: [],
          logs: [],
          reminders: [],
        },
        suggestions: [],
      });
      const row = await plantRow(res.body.plant.id);
      expect(row).toMatchObject({ user_id: user.id, crop_id: crop.a });
      expect(stored(row.avatar_url)).toBe(true);
      await get(`/plants/${res.body.plant.id}`).expect(200);
    });

    it('thiếu tên gọi và loại cây: 400, câu C4 6.1 ở từng trường', async () => {
      const res = await postPlant({ name: ' ' }).expect(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'name', message: MSG.REQUIRED },
          { field: 'cropId', message: MSG.REQUIRED },
        ]),
      );
    });

    it('loại cây đang ẩn: 400 CROP_NOT_FOUND; ảnh sai định dạng: 400, không tạo cây', async () => {
      const hidden = await postPlant({ name: 'A', cropId: crop.hidden }).expect(
        400,
      );
      expect(hidden.body).toMatchObject({
        code: 'CROP_NOT_FOUND',
        errors: [{ field: 'cropId', message: MSG.REQUIRED }],
      });
      const [{ n: before }] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM plants WHERE user_id = $1`,
        [user.id],
      );
      const bad = await postPlant(
        { name: 'Ảnh sai', cropId: crop.a },
        { avatar: GIF },
      ).expect(400);
      expect(bad.body).toMatchObject({
        code: 'INVALID_IMAGE_TYPE',
        message: MSG.IMAGE,
      });
      const [{ n: after }] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM plants WHERE user_id = $1`,
        [user.id],
      );
      expect(after).toBe(before);
    });

    it('id sai định dạng: 400; không tồn tại: 404', async () => {
      await get('/plants/abc').expect(400);
      await get('/plants/999999999999').expect(404);
    });
  });

  // --- P1 ---------------------------------------------------------------------

  describe('P1 danh sách (US-01; BR-01, 06; OQ-45)', () => {
    it('đang bệnh → đang điều trị → còn lại (theo chẩn đoán gần nhất rồi ngày tạo); 10 cây mỗi trang', async () => {
      const u = await register('list');
      const plant = (name: string, health: string, createdAgo: number) =>
        insertPlant(name, { userId: u.id, health, createdAgo });
      const healthyOld = await plant('khoẻ chẩn đoán cũ', 'HEALTHY', 10 * HOUR);
      const healthyNew = await plant(
        'khoẻ chẩn đoán mới',
        'HEALTHY',
        20 * HOUR,
      );
      const treating = await plant('đang điều trị', 'TREATING', 30 * HOUR);
      const diseased = await plant('đang bệnh', 'DISEASED', 40 * HOUR);
      const fresh = [];
      for (let i = 0; i < 8; i++) {
        fresh.push(await plant(`mới ${i}`, 'NOT_DIAGNOSED', i * HOUR));
      }
      await insertDiagnosis({
        userId: u.id,
        plantId: healthyOld,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
        ago: 5 * HOUR,
      });
      await insertDiagnosis({
        userId: u.id,
        plantId: healthyNew,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
        ago: HOUR,
      });
      // Lượt đã xoá không tính vào "chẩn đoán gần nhất" (BR-06).
      await insertDiagnosis({
        userId: u.id,
        plantId: healthyOld,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
        ago: 0,
        deleted: true,
      });

      const page1 = await get('/plants', u.token).expect(200);
      expect(page1.body).toMatchObject({ page: 1, pageSize: 10, total: 12 });
      const ids1 = (page1.body.items as { id: number }[]).map((p) => p.id);
      expect(ids1).toEqual([
        diseased,
        treating,
        healthyNew,
        healthyOld,
        ...fresh.slice(0, 6),
      ]);
      const page2 = await get('/plants?page=2', u.token).expect(200);
      expect((page2.body.items as { id: number }[]).map((p) => p.id)).toEqual(
        fresh.slice(6),
      );
      const card = (page1.body.items as Record<string, unknown>[])[2];
      expect(card).toEqual({
        id: healthyNew,
        name: `${P} khoẻ chẩn đoán mới`,
        crop: { id: crop.a, code: `E2EP${RUN}A`, name: `${P} cây A` },
        avatarUrl: null,
        healthStatus: 'HEALTHY',
        lastDiagnosedAt: expect.any(String),
      });
      await db.query(`DELETE FROM diagnoses WHERE user_id = $1`, [u.id]);
      await db.query(`DELETE FROM plants WHERE user_id = $1`, [u.id]);
      await db.query(`DELETE FROM users WHERE id = $1`, [u.id]);
    });
  });

  // --- P4 ---------------------------------------------------------------------

  describe('P4 sửa (US-07, BR-10)', () => {
    it('đổi tên, loại cây; chuỗi rỗng xoá ngày trồng và ghi chú; ảnh mới thay ảnh cũ', async () => {
      const created = await postPlant(
        {
          name: 'Trước',
          cropId: crop.a,
          plantedDate: '2026-09-01',
          note: 'Cũ',
        },
        { avatar: JPG },
      ).expect(201);
      const id = created.body.plant.id as number;
      const oldKey = (await plantRow(id)).avatar_url;
      const res = await auth(request(http).patch(api(`/plants/${id}`)))
        .field('name', 'Sau')
        .field('cropId', String(crop.b))
        .field('plantedDate', '')
        .field('note', '')
        .attach('avatar', PNG, {
          filename: 'moi.png',
          contentType: 'image/png',
        })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'Sau',
        crop: { id: crop.b },
        plantedDate: null,
        note: null,
        avatarUrl: expect.stringMatching(/\.png$/),
      });
      expect(stored(oldKey)).toBe(false);
      expect(stored((await plantRow(id)).avatar_url)).toBe(true);
    });

    it('gửi tên rỗng: 400 câu C4 6.1', async () => {
      const id = await insertPlant('sửa tên rỗng');
      const res = await auth(request(http).patch(api(`/plants/${id}`)))
        .field('name', ' ')
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'name', message: MSG.REQUIRED },
      ]);
    });
  });

  // --- P6, P7 -----------------------------------------------------------------

  describe('P6 cập nhật tình trạng (US-05; BR-08, 16; OQ-47)', () => {
    it('Đang có bệnh → Đang điều trị → Đã khỏi: mỗi lần một nhật ký; Đã khỏi tắt nhắc kiểm tra lại', async () => {
      const id = await insertPlant('điều trị', { health: 'DISEASED' });
      await db.query(
        `INSERT INTO reminders (plant_id, reminder_type, title, next_remind_at, source)
         VALUES ($1, 'RECHECK', 'Kiểm tra lại cây', now() + interval '3 days', 'USER'),
                ($1, 'WATERING', 'Tưới nước', now() + interval '2 days', 'SYSTEM')`,
        [id],
      );
      const treating = await postJson(`/plants/${id}/status`, {
        status: 'TREATING',
      }).expect(200);
      expect(treating.body).toMatchObject({
        healthStatus: 'TREATING',
        allowedStatusChanges: ['RECOVERED'],
        logs: [{ logType: 'STATUS_CHANGE', statusAfter: 'TREATING' }],
      });
      const again = await postJson(`/plants/${id}/status`, {
        status: 'TREATING',
      }).expect(400);
      expect(again.body).toEqual({
        statusCode: 400,
        code: 'PLANT_STATUS_NOT_ALLOWED',
        message: MSG.STATUS,
      });
      const recovered = await postJson(`/plants/${id}/status`, {
        status: 'RECOVERED',
      }).expect(200);
      expect(recovered.body.healthStatus).toBe('RECOVERED');
      expect(recovered.body.logs).toHaveLength(2);
      expect(
        (recovered.body.reminders as { type: string }[]).map((r) => r.type),
      ).toEqual(['WATERING']);
    });

    it('cây chưa chẩn đoán: không chuyển được', async () => {
      const id = await insertPlant('chưa chẩn đoán');
      await postJson(`/plants/${id}/status`, { status: 'RECOVERED' }).expect(
        400,
      );
      expect((await plantRow(id)).health_status).toBe('NOT_DIAGNOSED');
    });
  });

  describe('P7 ghi chú chăm sóc (US-06, BR-09)', () => {
    it('có nội dung, ngày, ảnh: 201; không đổi tình trạng; hiện ở chi tiết', async () => {
      const id = await insertPlant('ghi chú', { health: 'DISEASED' });
      const res = await auth(request(http).post(api(`/plants/${id}/logs`)))
        .field('content', ' Phun thuốc lần 1 ')
        .field('actionDate', '2026-11-20')
        .attach('image', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        logType: 'CARE_NOTE',
        content: 'Phun thuốc lần 1',
        statusAfter: null,
        imageUrl: expect.stringMatching(/\/plant-logs\/.+\.jpg$/),
        actionDate: '2026-11-20',
        createdAt: expect.any(String),
      });
      const detail = await get(`/plants/${id}`).expect(200);
      expect(detail.body.healthStatus).toBe('DISEASED');
      expect(detail.body.logs).toHaveLength(1);
    });

    it('thiếu nội dung: 400 câu riêng', async () => {
      const id = await insertPlant('ghi chú rỗng');
      const res = await auth(request(http).post(api(`/plants/${id}/logs`)))
        .field('content', '  ')
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'content', message: MSG.CONTENT },
      ]);
    });
  });

  // --- A1, A2, D1 -------------------------------------------------------------

  describe('A1 gắn lượt vào cây (diagnosis BR-22 → 25; OQ-48)', () => {
    it('lượt DISEASE vào cây chưa chẩn đoán: Đang có bệnh; bệnh đang mắc hiện ở chi tiết', async () => {
      const plantId = await insertPlant('gắn bệnh');
      const dId = await insertDiagnosis({
        resultType: 'DISEASE',
        labelId: label.mold,
      });
      const res = await postJson(`/diagnoses/${dId}/plant`, {
        plantId,
      }).expect(200);
      expect(res.body).toEqual({
        plant: { id: plantId, name: `${P} gắn bệnh`, healthStatus: 'DISEASED' },
        suggestRecovered: false,
        suggestions: [],
      });
      expect(await diagnosisPlantId(dId)).toBe(plantId);
      const detail = await get(`/plants/${plantId}`).expect(200);
      expect(detail.body).toMatchObject({
        currentDisease: {
          diagnosisId: dId,
          id: moldId,
          name: `${P} Bệnh mốc`,
          severity: 'HIGH',
          treatment: 'Xử lý 1',
          detailAvailable: true,
        },
        diagnoses: [
          { id: dId, resultType: 'DISEASE', disease: { id: moldId } },
        ],
      });
      // D2 cũng trả tên cây (history Bảng 4.6).
      const d2 = await get(`/diagnoses/${dId}`).expect(200);
      expect(d2.body.plant).toEqual({ id: plantId, name: `${P} gắn bệnh` });
    });

    it('lượt khoẻ mới hơn vào cây đang bệnh: Khoẻ mạnh, gợi ý Đã khỏi; xác nhận được bằng P6', async () => {
      const plantId = await insertPlant('khỏi', { health: 'DISEASED' });
      await insertDiagnosis({
        plantId,
        resultType: 'DISEASE',
        labelId: label.mold,
        ago: 2 * HOUR,
      });
      const dId = await insertDiagnosis({
        resultType: 'HEALTHY',
        labelId: label.healthyA,
      });
      const res = await postJson(`/diagnoses/${dId}/plant`, {
        plantId,
      }).expect(200);
      expect(res.body).toMatchObject({
        plant: { healthStatus: 'HEALTHY' },
        suggestRecovered: true,
      });
      // OQ-46: cây đã khoẻ thì không còn "bệnh đang mắc".
      const detail = await get(`/plants/${plantId}`).expect(200);
      expect(detail.body.currentDisease).toBeNull();
      await postJson(`/plants/${plantId}/status`, {
        status: 'RECOVERED',
      }).expect(200);
    });

    it('gắn lượt cũ hơn lượt đã có: chỉ thêm vào dòng thời gian, không đổi tình trạng', async () => {
      const plantId = await insertPlant('lượt cũ', { health: 'HEALTHY' });
      await insertDiagnosis({
        plantId,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
        ago: HOUR,
      });
      const oldId = await insertDiagnosis({
        resultType: 'DISEASE',
        labelId: label.mold,
        ago: 5 * HOUR,
      });
      const res = await postJson(`/diagnoses/${oldId}/plant`, {
        plantId,
      }).expect(200);
      expect(res.body.plant.healthStatus).toBe('HEALTHY');
      expect((await get(`/plants/${plantId}`)).body.diagnoses).toHaveLength(2);
    });

    it('lượt UNCERTAIN: không đổi tình trạng; khác loại cây vẫn gắn được (BR-23 chỉ cảnh báo ở giao diện)', async () => {
      const plantId = await insertPlant('khác loại', {
        cropId: crop.b,
        health: 'HEALTHY',
      });
      const dId = await insertDiagnosis({
        resultType: 'UNCERTAIN',
        labelId: label.mold,
      });
      const res = await postJson(`/diagnoses/${dId}/plant`, {
        plantId,
      }).expect(200);
      expect(res.body.plant.healthStatus).toBe('HEALTHY');
    });

    it('lượt đã gắn: 409; lượt đã xoá hoặc của người khác: 404; cây của người khác: 404, lượt vẫn chưa gắn', async () => {
      const plantId = await insertPlant('lỗi gắn');
      const linked = await insertDiagnosis({
        plantId,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
      });
      const conflict = await postJson(`/diagnoses/${linked}/plant`, {
        plantId,
      }).expect(409);
      expect(conflict.body).toEqual({
        statusCode: 409,
        code: 'DIAGNOSIS_ALREADY_LINKED',
        message: MSG.LINKED,
      });
      const deleted = await insertDiagnosis({
        resultType: 'HEALTHY',
        labelId: label.healthyA,
        deleted: true,
      });
      await postJson(`/diagnoses/${deleted}/plant`, { plantId }).expect(404);
      const others = await insertDiagnosis({
        userId: other.id,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
      });
      await postJson(`/diagnoses/${others}/plant`, { plantId }).expect(404);

      const othersPlant = await insertPlant('cây người khác', {
        userId: other.id,
      });
      const free = await insertDiagnosis({
        resultType: 'DISEASE',
        labelId: label.mold,
      });
      const res = await postJson(`/diagnoses/${free}/plant`, {
        plantId: othersPlant,
      }).expect(404);
      expect(res.body.code).toBe('PLANT_NOT_FOUND');
      expect(await diagnosisPlantId(free)).toBeNull();
    });
  });

  describe('A2 tạo cây mới từ lượt (diagnosis BR-27)', () => {
    it.each([
      ['DISEASE', 'DISEASED'],
      ['HEALTHY', 'HEALTHY'],
      ['UNCERTAIN', 'NOT_DIAGNOSED'],
    ] as const)(
      'lượt %s → cây mới %s, lượt gắn vào cây',
      async (type, health) => {
        const dId = await insertDiagnosis({
          resultType: type,
          labelId: type === 'HEALTHY' ? label.healthyA : label.mold,
        });
        const res = await postPlant(
          { name: `Từ kết quả ${type}`, cropId: crop.a },
          { path: `/diagnoses/${dId}/new-plant`, avatar: JPG },
        ).expect(201);
        expect(res.body).toEqual({
          plant: {
            id: expect.any(Number),
            name: `Từ kết quả ${type}`,
            healthStatus: health,
          },
          suggestRecovered: false,
          suggestions: [],
        });
        expect(await diagnosisPlantId(dId)).toBe(res.body.plant.id);
      },
    );

    it('thiếu tên: 400; lượt đã gắn: 409, không tạo cây', async () => {
      const dId = await insertDiagnosis({
        resultType: 'HEALTHY',
        labelId: label.healthyA,
      });
      await postPlant(
        { cropId: crop.a },
        { path: `/diagnoses/${dId}/new-plant` },
      ).expect(400);
      const plantId = await insertPlant('đã có lượt');
      await db.query(`UPDATE diagnoses SET plant_id = $1 WHERE id = $2`, [
        plantId,
        dId,
      ]);
      const [{ n: before }] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM plants WHERE user_id = $1`,
        [user.id],
      );
      await postPlant(
        { name: 'Không được tạo', cropId: crop.a },
        { path: `/diagnoses/${dId}/new-plant` },
      ).expect(409);
      const [{ n: after }] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM plants WHERE user_id = $1`,
        [user.id],
      );
      expect(after).toBe(before);
    });
  });

  describe('D1 chẩn đoán từ hồ sơ cây (diagnosis BR-24; my_plants BR-07)', () => {
    const diagnose = (fields: Record<string, number>) => {
      let req = auth(request(http).post(api('/diagnoses')));
      for (const [k, v] of Object.entries(fields))
        req = req.field(k, String(v));
      return req
        .attach('original', JPG, {
          filename: 'g.jpg',
          contentType: 'image/jpeg',
        })
        .attach('processed', JPG, {
          filename: 'c.jpg',
          contentType: 'image/jpeg',
        });
    };

    it('kết quả tự gắn vào cây, cây chuyển Đang có bệnh, trả plantLink', async () => {
      const plantId = await insertPlant('chẩn đoán lại', { health: 'HEALTHY' });
      ai.classCode = `${LP}_mold`;
      const res = await diagnose({ cropId: crop.a, plantId }).expect(201);
      expect(res.body).toMatchObject({
        resultType: 'DISEASE',
        plant: { id: plantId },
        plantLink: {
          plant: { id: plantId, healthStatus: 'DISEASED' },
          suggestRecovered: false,
        },
      });
      expect(await diagnosisPlantId(res.body.id as number)).toBe(plantId);
    });

    it('không có plantId: plantLink null', async () => {
      ai.classCode = `${LP}_healthyA`;
      const res = await diagnose({ cropId: crop.a }).expect(201);
      expect(res.body.plantLink).toBeNull();
      expect(res.body.plant).toBeNull();
    });

    it('cây khác loại cây đã chọn: 400 trường cropId; cây của người khác: 404; không tạo lượt', async () => {
      const [{ n: before }] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM diagnoses WHERE user_id = $1`,
        [user.id],
      );
      const plantB = await insertPlant('loại B', { cropId: crop.b });
      const mismatch = await diagnose({
        cropId: crop.a,
        plantId: plantB,
      }).expect(400);
      expect(mismatch.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'cropId', message: MSG.INVALID }],
      });
      const othersPlant = await insertPlant('không phải của tôi', {
        userId: other.id,
      });
      const missing = await diagnose({
        cropId: crop.a,
        plantId: othersPlant,
      }).expect(404);
      expect(missing.body.code).toBe('PLANT_NOT_FOUND');
      const [{ n: after }] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM diagnoses WHERE user_id = $1`,
        [user.id],
      );
      expect(after).toBe(before);
    });
  });

  // --- P5 ---------------------------------------------------------------------

  describe('P5 xoá cây (US-08, BR-11)', () => {
    it('xoá nhật ký, lịch nhắc, ảnh; giữ lượt chẩn đoán (gỡ liên kết) và thông báo', async () => {
      const created = await postPlant(
        { name: 'Sẽ xoá', cropId: crop.a },
        { avatar: JPG },
      ).expect(201);
      const id = created.body.plant.id as number;
      const avatarKey = (await plantRow(id)).avatar_url;
      await auth(request(http).post(api(`/plants/${id}/logs`)))
        .field('content', 'Ghi chú có ảnh')
        .attach('image', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(201);
      const [log] = await db.query<{ image_url: string }[]>(
        `SELECT image_url FROM plant_logs WHERE plant_id = $1`,
        [id],
      );
      const [reminder] = await db.query<{ id: number }[]>(
        `INSERT INTO reminders (plant_id, reminder_type, title, next_remind_at, source)
         VALUES ($1, 'RECHECK', 'Kiểm tra lại cây', now(), 'USER') RETURNING id`,
        [id],
      );
      const [notice] = await db.query<{ id: number }[]>(
        `INSERT INTO notifications (user_id, reminder_id, title, content)
         VALUES ($1, $2, 'Tiêu đề', 'Nội dung') RETURNING id`,
        [user.id, reminder.id],
      );
      const dId = await insertDiagnosis({
        plantId: id,
        resultType: 'HEALTHY',
        labelId: label.healthyA,
      });

      await auth(request(http).delete(api(`/plants/${id}`))).expect(204);

      await get(`/plants/${id}`).expect(404);
      const counts = await db.query<{ logs: number; reminders: number }[]>(
        `SELECT (SELECT COUNT(*)::int FROM plant_logs WHERE plant_id = $1) AS logs,
                (SELECT COUNT(*)::int FROM reminders WHERE plant_id = $1) AS reminders`,
        [id],
      );
      expect(counts[0]).toEqual({ logs: 0, reminders: 0 });
      expect(await diagnosisPlantId(dId)).toBeNull();
      await get(`/diagnoses/${dId}`).expect(200);
      const [n] = await db.query<{ reminder_id: number | null }[]>(
        `SELECT reminder_id FROM notifications WHERE id = $1`,
        [notice.id],
      );
      expect(n.reminder_id).toBeNull();
      expect(stored(avatarKey)).toBe(false);
      expect(stored(log.image_url)).toBe(false);
    });
  });
});
