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
  AiServiceError,
  type AiErrorKind,
  type AiPredictInput,
  type AiPredictResult,
} from '../src/modules/diagnosis/ai/ai-client.js';

/**
 * E2E feature diagnosis (UC02, docs/diagnosis/api_diagnosis.md D1, D2).
 * Chạy trên PostgreSQL thật (`docker compose up -d`, đã chạy migration).
 *
 * - AI: thay AiClient bằng bản giả để chủ động ra từng kết quả và từng lỗi (TD-04).
 * - Ảnh: LocalDiskStorage trong thư mục tạm, xoá ở afterAll.
 * - Dữ liệu riêng: 2 loại cây (1 ACTIVE, 1 HIDDEN), 2 bệnh, 3 nhãn, 3 người dùng, mang
 *   tiền tố của lần chạy và bị xoá ở afterAll.
 * - Ngưỡng đặt 0.6 cho test biên (testing-rules mục 3).
 */
const RUN = Date.now();
const P = `E2E-DIAG ${RUN}`;
const EMAIL_PREFIX = `e2e-diag-${RUN}`;
const LP = `E2E_DIAG_${RUN}`;
const THRESHOLD = 0.6;
const MB10 = 10 * 1024 * 1024;

const MSG = {
  CROP: 'Vui lòng chọn loại cây',
  IMAGE: 'Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB',
  BUSY: 'Hệ thống đang bận, vui lòng thử lại sau',
  REJECTED: 'Ảnh chưa phân tích được. Hãy chụp lại một lá rõ nét, đủ sáng.',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  INVALID: 'Dữ liệu không hợp lệ',
  UNAUTHORIZED: 'Vui lòng đăng nhập',
  NOTICE_TITLE: 'Nhãn mô hình chưa có trong danh mục',
};

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7]);
const GIF = Buffer.from('GIF89a-khong-phai-anh-hop-le');
/** Ảnh JPG "giả" đúng `size` byte (chỉ cần magic bytes). */
const jpgOfSize = (size: number) => {
  const b = Buffer.alloc(size, 1);
  JPG.copy(b, 0, 0, 4);
  return b;
};

/** AI giả: mỗi test đặt `respond`; ghi lại mọi lời gọi. */
class FakeAiClient extends AiClient {
  calls: AiPredictInput[] = [];
  respond: (input: AiPredictInput) => Promise<AiPredictResult> = () =>
    Promise.reject(new Error('Test chưa đặt kết quả AI'));

  predict(input: AiPredictInput): Promise<AiPredictResult> {
    this.calls.push(input);
    return this.respond(input);
  }

  getLabels(): Promise<string[]> {
    return Promise.resolve([]);
  }

  returns(predictions: [string, number][]): void {
    this.respond = () =>
      Promise.resolve({
        modelVersion: 'e2e-1',
        inferenceMs: 42,
        predictions: predictions.map(([classCode, probability]) => ({
          classCode,
          probability,
        })),
      });
  }

  fails(kind: AiErrorKind): void {
    this.respond = () =>
      Promise.reject(new AiServiceError(kind, `e2e ${kind}`));
  }
}

interface Prediction {
  rank: number;
  probability: number;
  labelType: string;
  disease: Record<string, unknown> | null;
}

describe('Diagnosis (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let uploadDir: string;
  let publicBaseUrl: string;
  const ai = new FakeAiClient();

  const user = { id: 0, token: '' };
  const other = { id: 0, token: '' };
  const admin = { id: 0, token: '' };
  const crop = { t: 0, hidden: 0 };
  const disease = { pub: 0, hidden: 0 };
  const label = {
    healthy: `${LP}_healthy`,
    pub: `${LP}_pub`,
    hidden: `${LP}_hidden`,
  };

  const api = (p: string) => `/api/v1${p}`;

  function postDiagnosis(
    o: {
      token?: string | null;
      cropId?: string | number | null;
      original?: Buffer | null;
      processed?: Buffer | null;
    } = {},
  ) {
    let req = request(http).post(api('/diagnoses'));
    if (o.token !== null) {
      req = req.set('Authorization', `Bearer ${o.token ?? user.token}`);
    }
    if (o.cropId !== null)
      req = req.field('cropId', String(o.cropId ?? crop.t));
    if (o.original !== null) {
      req = req.attach('original', o.original ?? JPG, {
        filename: 'goc.jpg',
        contentType: 'image/jpeg',
      });
    }
    if (o.processed !== null) {
      req = req.attach('processed', o.processed ?? PNG, {
        filename: 'chinh.png',
        contentType: 'image/png',
      });
    }
    return req;
  }

  const getDiagnosis = (
    id: number | string,
    token: string | null = user.token,
  ) => {
    const req = request(http).get(api(`/diagnoses/${id}`));
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  async function register(key: string) {
    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: `Người Dùng Chẩn Đoán ${key}`,
        email: `${EMAIL_PREFIX}-${key}@example.test`,
        password: 'matkhau1',
        confirmPassword: 'matkhau1',
      })
      .expect(201);
    const token = res.body.accessToken as string;
    const id = Number(app.get(JwtService).decode<{ sub: number }>(token).sub);
    return { id, token };
  }

  async function diagnosisRow(id: number) {
    const [row] = await db.query<Record<string, unknown>[]>(
      `SELECT * FROM diagnoses WHERE id = $1`,
      [id],
    );
    return row;
  }

  async function predictionRows(id: number) {
    return db.query<
      { class_code: string; probability: number; rank_no: number }[]
    >(
      `SELECT ml.class_code, p.probability::float8 AS probability, p.rank_no
         FROM diagnosis_predictions p JOIN model_labels ml ON ml.id = p.label_id
        WHERE p.diagnosis_id = $1 ORDER BY p.rank_no`,
      [id],
    );
  }

  async function latestDiagnosisOf(userId: number) {
    const [row] = await db.query<{ id: number }[]>(
      `SELECT id FROM diagnoses WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId],
    );
    return row ? Number(row.id) : null;
  }

  async function countDiagnosesOf(userId: number) {
    const [row] = await db.query<{ n: number }[]>(
      `SELECT COUNT(*)::int AS n FROM diagnoses WHERE user_id = $1`,
      [userId],
    );
    return row.n;
  }

  async function adminNoticesFor(code: string) {
    return db.query<{ user_id: number; title: string; content: string }[]>(
      `SELECT user_id, title, content FROM notifications
        WHERE reminder_id IS NULL AND content LIKE $1 ORDER BY id`,
      [`%nhãn ${code} nhưng%`],
    );
  }

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    process.env.AI_CONFIDENCE_THRESHOLD = String(THRESHOLD);
    process.env.AI_TOP_K = '3';
    const env = validateEnv(process.env);
    const { AppModule } = await import('../src/app.module.js');

    uploadDir = await mkdtemp(path.join(os.tmpdir(), 'e2e-diag-uploads-'));
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

    const insertCrop = async (key: string, status: string) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO crops (code, name, status, care_guide) VALUES ($1, $2, $3, $4) RETURNING id`,
        [`E2E${RUN}${key}`, `${P} cây ${key}`, status, `Gợi ý chăm sóc ${key}`],
      );
      return Number(row.id);
    };
    crop.t = await insertCrop('T', 'ACTIVE');
    crop.hidden = await insertCrop('H', 'HIDDEN');

    const insertDisease = async (key: string, status: string) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO diseases (crop_id, name, pathogen_group, severity, summary, symptoms,
           treatment, status, published_at)
         VALUES ($1, $2, 'FUNGUS', 'HIGH', $3, 'Triệu chứng 1\nTriệu chứng 2', 'Xử lý 1\nXử lý 2', $4, now())
         RETURNING id`,
        [crop.t, `${P} ${key}`, `Tóm tắt ${key}`, status],
      );
      return Number(row.id);
    };
    disease.pub = await insertDisease('pub', 'PUBLISHED');
    disease.hidden = await insertDisease('hidden', 'HIDDEN');

    await db.query(
      `INSERT INTO model_labels (class_code, label_type, crop_id, disease_id)
       VALUES ($1, 'HEALTHY', $4, NULL), ($2, 'DISEASE', $4, $5), ($3, 'DISEASE', $4, $6)`,
      [
        label.healthy,
        label.pub,
        label.hidden,
        crop.t,
        disease.pub,
        disease.hidden,
      ],
    );
  });

  afterAll(async () => {
    if (db) {
      const users = [user.id, other.id, admin.id].filter(Boolean);
      const run = (sql: string, params: unknown[]) =>
        db.query(sql, params).catch(() => undefined);
      await run(`DELETE FROM notifications WHERE content LIKE $1`, [`%${LP}%`]);
      await run(`DELETE FROM diagnoses WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM model_labels WHERE class_code LIKE $1`, [
        `${LP}_%`,
      ]);
      await run(`DELETE FROM diseases WHERE crop_id = ANY($1)`, [
        [crop.t, crop.hidden],
      ]);
      await run(`DELETE FROM crops WHERE id = ANY($1)`, [
        [crop.t, crop.hidden],
      ]);
      await run(`DELETE FROM notifications WHERE user_id = ANY($1)`, [users]);
      await run(`DELETE FROM users WHERE email LIKE $1`, [`${EMAIL_PREFIX}-%`]);
    }
    await app?.close();
    if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    ai.calls = [];
    ai.respond = () => Promise.reject(new Error('Test chưa đặt kết quả AI'));
  });

  // --- Phân quyền -------------------------------------------------------------

  describe('Phân quyền (BR-G03, OQ-22)', () => {
    it('chưa đăng nhập: D1, D2 trả 401', async () => {
      for (const res of [
        await postDiagnosis({ token: null }).expect(401),
        await getDiagnosis(1, null).expect(401),
      ]) {
        expect(res.body).toMatchObject({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: MSG.UNAUTHORIZED,
        });
      }
      expect(ai.calls).toHaveLength(0);
    });

    it('ADMIN chẩn đoán được như USER; lượt gắn với chính ADMIN', async () => {
      ai.returns([[label.healthy, 0.9]]);
      const res = await postDiagnosis({ token: admin.token }).expect(201);
      expect((await diagnosisRow(res.body.id)).user_id).toBe(admin.id);
      await getDiagnosis(res.body.id, admin.token).expect(200);
    });
  });

  // --- D1 thành công ----------------------------------------------------------

  describe('D1 POST /diagnoses: kết quả (BR-07, BR-12, BR-13)', () => {
    it('DISEASE: trả đủ DiagnosisResult, gửi AI đúng dữ liệu, ghi đủ CSDL', async () => {
      ai.returns([
        [label.pub, 0.8123],
        [label.healthy, 0.1102],
        [label.hidden, 0.05],
      ]);
      const res = await postDiagnosis().expect(201);

      // AI nhận ảnh đã chỉnh, mã loại cây đã chọn, top_k = 3 (OQ-05, BR-07).
      expect(ai.calls).toHaveLength(1);
      expect(ai.calls[0]).toMatchObject({
        cropCode: `E2E${RUN}T`,
        contentType: 'image/png',
        topK: 3,
      });
      expect(Buffer.compare(ai.calls[0].image, PNG)).toBe(0);

      const imageUrl = (ext: string) =>
        new RegExp(
          `^${publicBaseUrl}/diagnoses/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.${ext}$`,
        );
      expect(res.body).toEqual({
        id: expect.any(Number),
        resultType: 'DISEASE',
        createdAt: expect.any(String),
        crop: {
          id: crop.t,
          code: `E2E${RUN}T`,
          name: `${P} cây T`,
          careGuide: 'Gợi ý chăm sóc T',
        },
        plant: null,
        originalImageUrl: expect.stringMatching(imageUrl('jpg')),
        processedImageUrl: expect.stringMatching(imageUrl('png')),
        predictions: [
          {
            rank: 1,
            probability: 0.8123,
            labelType: 'DISEASE',
            disease: {
              id: disease.pub,
              name: `${P} pub`,
              severity: 'HIGH',
              pathogenGroup: 'FUNGUS',
              summary: 'Tóm tắt pub',
              symptoms: 'Triệu chứng 1\nTriệu chứng 2',
              treatment: 'Xử lý 1\nXử lý 2',
              detailAvailable: true,
            },
          },
          { rank: 2, probability: 0.1102, labelType: 'HEALTHY', disease: null },
          {
            rank: 3,
            probability: 0.05,
            labelType: 'DISEASE',
            disease: expect.objectContaining({
              id: disease.hidden,
              detailAvailable: false,
            }),
          },
        ],
      });

      const row = await diagnosisRow(res.body.id);
      expect(row).toMatchObject({
        user_id: user.id,
        crop_id: crop.t,
        plant_id: null,
        status: 'COMPLETED',
        result_type: 'DISEASE',
        model_version: 'e2e-1',
        inference_ms: 42,
        deleted_at: null,
      });
      expect(row.completed_at).toBeInstanceOf(Date);
      expect(row.original_image_url).toMatch(/^diagnoses\/.+\.jpg$/);
      expect(row.processed_image_url).toMatch(/^diagnoses\/.+\.png$/);
      for (const key of ['original_image_url', 'processed_image_url']) {
        expect(existsSync(path.join(uploadDir, row[key] as string))).toBe(true);
      }
      expect(await predictionRows(res.body.id)).toEqual([
        { class_code: label.pub, probability: 0.8123, rank_no: 1 },
        { class_code: label.healthy, probability: 0.1102, rank_no: 2 },
        { class_code: label.hidden, probability: 0.05, rank_no: 3 },
      ]);
    });

    it('HEALTHY: nhãn hạng 1 là HEALTHY, có gợi ý chăm sóc; AI trả 1 dự đoán thì lưu 1 dòng', async () => {
      ai.returns([[label.healthy, 0.93]]);
      const res = await postDiagnosis().expect(201);
      expect(res.body).toMatchObject({
        resultType: 'HEALTHY',
        crop: { careGuide: 'Gợi ý chăm sóc T' },
        predictions: [
          { rank: 1, probability: 0.93, labelType: 'HEALTHY', disease: null },
        ],
      });
      expect(await predictionRows(res.body.id)).toHaveLength(1);
    });

    it.each([
      [label.pub, 0.5999, 'UNCERTAIN', 0.5999],
      [label.pub, 0.6, 'DISEASE', 0.6],
      [label.pub, 0.6001, 'DISEASE', 0.6001],
      [label.healthy, 0.5999, 'UNCERTAIN', 0.5999],
      [label.healthy, 0.6, 'HEALTHY', 0.6],
      // Làm tròn 4 chữ số (DECIMAL(5,4)) trước khi so ngưỡng.
      [label.pub, 0.59996, 'DISEASE', 0.6],
    ])(
      'biên ngưỡng 0.6: %s xác suất %s → %s (lưu %s)',
      async (code, probability, resultType, stored) => {
        ai.returns([[code, probability]]);
        const res = await postDiagnosis().expect(201);
        expect(res.body.resultType).toBe(resultType);
        expect((res.body.predictions as Prediction[])[0].probability).toBe(
          stored,
        );
        expect((await diagnosisRow(res.body.id)).result_type).toBe(resultType);
      },
    );

    it('ảnh đúng 10 MB được nhận (biên BR-04)', async () => {
      ai.returns([[label.healthy, 0.9]]);
      await postDiagnosis({ original: jpgOfSize(MB10) }).expect(201);
    }, 30_000);
  });

  // --- D1 lỗi AI --------------------------------------------------------------

  describe('D1: AI lỗi (BR-10, BR-11)', () => {
    it.each([
      ['timeout', 503, 'AI_UNAVAILABLE', MSG.BUSY],
      ['unavailable', 503, 'AI_UNAVAILABLE', MSG.BUSY],
      ['invalid_response', 503, 'AI_UNAVAILABLE', MSG.BUSY],
      ['bad_request', 422, 'AI_IMAGE_REJECTED', MSG.REJECTED],
    ] as const)(
      'AI %s → %i %s; lượt chuyển FAILED, không có dự đoán, D2 không xem được',
      async (kind, status, code, message) => {
        ai.fails(kind);
        const res = await postDiagnosis().expect(status);
        expect(res.body).toEqual({ statusCode: status, code, message });

        const id = (await latestDiagnosisOf(user.id))!;
        const row = await diagnosisRow(id);
        expect(row).toMatchObject({ status: 'FAILED', result_type: null });
        expect(row.completed_at).toBeInstanceOf(Date);
        expect(await predictionRows(id)).toHaveLength(0);
        await getDiagnosis(id).expect(404);
      },
    );

    it('nhãn lạ ở hạng 1: 503, FAILED, báo mọi ADMIN đúng một lần cho cùng class_code', async () => {
      const unknown = `${LP}_unknown`;
      ai.returns([[unknown, 0.9]]);
      for (let i = 0; i < 2; i++) {
        const res = await postDiagnosis().expect(503);
        expect(res.body).toEqual({
          statusCode: 503,
          code: 'AI_UNAVAILABLE',
          message: MSG.BUSY,
        });
        const id = (await latestDiagnosisOf(user.id))!;
        expect((await diagnosisRow(id)).status).toBe('FAILED');
      }
      const notices = await adminNoticesFor(unknown);
      const mine = notices.filter((n) => Number(n.user_id) === admin.id);
      expect(mine).toEqual([
        {
          user_id: admin.id,
          title: MSG.NOTICE_TITLE,
          content: `Mô hình trả về nhãn ${unknown} nhưng danh mục chưa có nhãn này. Lượt chẩn đoán đã bị dừng. Vui lòng cập nhật ánh xạ nhãn.`,
        },
      ]);
      // Người dùng thường không nhận thông báo này.
      expect(notices.some((n) => Number(n.user_id) === user.id)).toBe(false);
    });

    it('nhãn lạ ở hạng sau cũng dừng lượt và báo ADMIN', async () => {
      const unknown = `${LP}_unknown_rank2`;
      ai.returns([
        [label.pub, 0.8],
        [unknown, 0.1],
      ]);
      await postDiagnosis().expect(503);
      const id = (await latestDiagnosisOf(user.id))!;
      expect((await diagnosisRow(id)).status).toBe('FAILED');
      expect(await predictionRows(id)).toHaveLength(0);
      const notices = await adminNoticesFor(unknown);
      expect(
        notices.filter((n) => Number(n.user_id) === admin.id),
      ).toHaveLength(1);
    });
  });

  // --- D1 kiểm tra đầu vào ------------------------------------------------------

  describe('D1: kiểm tra đầu vào, không ghi gì, không gọi AI (BR-04, BR-07, OQ-05)', () => {
    let before: number;
    beforeEach(async () => {
      before = await countDiagnosesOf(user.id);
    });
    afterEach(async () => {
      expect(await countDiagnosesOf(user.id)).toBe(before);
      expect(ai.calls).toHaveLength(0);
    });

    it.each([
      ['thiếu cropId', null],
      ['cropId không phải số', 'abc'],
      ['cropId bằng 0', '0'],
    ])('%s: 400 VALIDATION_ERROR, lỗi trường cropId', async (_, cropId) => {
      const res = await postDiagnosis({ cropId }).expect(400);
      expect(res.body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: MSG.INVALID,
        errors: [{ field: 'cropId', message: MSG.CROP }],
      });
    });

    it('loại cây đang ẩn hoặc không tồn tại: 400 CROP_NOT_FOUND', async () => {
      for (const cropId of [crop.hidden, 999999999]) {
        const res = await postDiagnosis({ cropId }).expect(400);
        expect(res.body).toEqual({
          statusCode: 400,
          code: 'CROP_NOT_FOUND',
          message: MSG.CROP,
          errors: [{ field: 'cropId', message: MSG.CROP }],
        });
      }
    });

    it.each([
      ['thiếu ảnh gốc', { original: null }],
      ['thiếu ảnh đã chỉnh', { processed: null }],
      ['ảnh gốc không phải JPG/PNG', { original: GIF }],
      ['ảnh đã chỉnh không phải JPG/PNG', { processed: GIF }],
    ])('%s: 400 INVALID_IMAGE_TYPE', async (_, o) => {
      const res = await postDiagnosis(o).expect(400);
      expect(res.body).toEqual({
        statusCode: 400,
        code: 'INVALID_IMAGE_TYPE',
        message: MSG.IMAGE,
      });
    });

    it.each([
      ['10 MB + 1 byte', MB10 + 1],
      ['quá giới hạn cứng 20 MB', 20 * 1024 * 1024 + 1],
    ])(
      'ảnh %s: 400 IMAGE_TOO_LARGE',
      async (_, size) => {
        const res = await postDiagnosis({ processed: jpgOfSize(size) }).expect(
          400,
        );
        expect(res.body).toEqual({
          statusCode: 400,
          code: 'IMAGE_TOO_LARGE',
          message: MSG.IMAGE,
        });
      },
      30_000,
    );
  });

  // --- D2 ---------------------------------------------------------------------

  describe('D2 GET /diagnoses/:id (US-05, US-08, BR-G03, OQ-23)', () => {
    let id: number;
    let created: Record<string, unknown>;
    beforeAll(async () => {
      ai.returns([
        [label.pub, 0.7],
        [label.healthy, 0.2],
      ]);
      const res = await postDiagnosis().expect(201);
      id = res.body.id as number;
      created = res.body as Record<string, unknown>;
    });

    it('lượt của chính mình: trả đúng như D1', async () => {
      const res = await getDiagnosis(id).expect(200);
      expect(res.body).toEqual(created);
    });

    it('lượt của người khác: 404, kể cả ADMIN', async () => {
      for (const token of [other.token, admin.token]) {
        const res = await getDiagnosis(id, token).expect(404);
        expect(res.body).toEqual({
          statusCode: 404,
          code: 'DIAGNOSIS_NOT_FOUND',
          message: MSG.NOT_FOUND,
        });
      }
    });

    it('lượt đã xoá mềm hoặc đang PROCESSING: 404', async () => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO diagnoses (user_id, crop_id, original_image_url, processed_image_url, status)
         VALUES ($1, $2, 'e2e/a.jpg', 'e2e/b.jpg', 'PROCESSING') RETURNING id`,
        [user.id, crop.t],
      );
      await getDiagnosis(Number(row.id)).expect(404);

      await db.query(`UPDATE diagnoses SET deleted_at = now() WHERE id = $1`, [
        id,
      ]);
      await getDiagnosis(id).expect(404);
    });

    it('id không tồn tại: 404; id sai định dạng: 400', async () => {
      await getDiagnosis(999999999999).expect(404);
      const res = await getDiagnosis('abc').expect(400);
      expect(res.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'id', message: MSG.INVALID }],
      });
    });
  });
});
