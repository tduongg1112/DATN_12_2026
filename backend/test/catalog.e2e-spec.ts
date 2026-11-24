import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
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
  type AiPredictInput,
  type AiPredictResult,
} from '../src/modules/diagnosis/ai/ai-client.js';

/**
 * E2E feature catalog (UC06; docs/catalog/api_catalog.md C1 → C5, B1 → B7, M1, M2). Chạy
 * trên PostgreSQL thật (đã chạy migration).
 *
 * - AI giả trả danh sách nhãn đặt trong từng test. M2 tắt nhãn trên toàn CSDL, nên khi thử
 *   M2 danh sách là "mọi nhãn đang dùng trừ nhãn của test cần tắt", đọc ngay lúc gọi, để
 *   không đụng dữ liệu dev và các file e2e chạy song song.
 * - Lượt chẩn đoán chèn bằng SQL để thử chặn xoá (BR-09) là `UNCERTAIN`, bệnh ở `DRAFT`, nên
 *   không lọt vào "Đang phổ biến" của test thư viện.
 * - Ảnh lưu ở thư mục tạm. Dữ liệu mang tiền tố của lần chạy, xoá ở afterAll.
 */
const RUN = Date.now();
const P = `E2E-CAT ${RUN}`;
const EMAIL_PREFIX = `e2e-cat-${RUN}`;
const LP = `E2E_CAT_${RUN}`;
const CODE = `E2EC${RUN}`;

const MSG = {
  REQUIRED: 'Vui lòng nhập đầy đủ thông tin bắt buộc',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  INVALID: 'Dữ liệu không hợp lệ',
  IMAGE: 'Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  STATUS: 'Không thể chuyển sang trạng thái này',
  CROP_LOCKED: 'Không thể đổi loại cây của bệnh đã gán mã lớp',
  HAS_DIAGNOSES:
    'Bệnh đã có dữ liệu chẩn đoán nên không thể xoá. Bạn có thể ẩn bệnh.',
  NAME_TAKEN: 'Tên bệnh đã có trong loại cây này',
  CROP_CODE_TAKEN: 'Mã loại cây đã tồn tại',
  CROP_NAME_TAKEN: 'Tên loại cây đã tồn tại',
  AI: 'Không lấy được danh sách nhãn của mô hình. Vui lòng thử lại sau.',
};

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 7]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7]);
const GIF = Buffer.from('GIF89a-khong-phai-anh-hop-le');

class FakeAiClient extends AiClient {
  labels: () => Promise<string[]> = () => Promise.resolve([]);
  predict(_input: AiPredictInput): Promise<AiPredictResult> {
    return Promise.reject(new AiServiceError('unavailable', 'không dùng'));
  }
  getLabels(): Promise<string[]> {
    return this.labels();
  }
}

type Fields = Record<string, string | number | boolean>;

describe('Catalog (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let uploadDir: string;
  const ai = new FakeAiClient();

  const user = { id: 0, token: '' };
  const admin = { id: 0, token: '' };
  /** a, b: ACTIVE; hidden: HIDDEN. */
  const crop = { a: 0, b: 0 };

  const api = (p: string) => `/api/v1${p}`;
  const auth = (req: request.Test, token = admin.token) =>
    req.set('Authorization', `Bearer ${token}`);
  const get = (p: string, token = admin.token) =>
    auth(request(http).get(api(p)), token);
  const postJson = (p: string, body: object, token = admin.token) =>
    auth(request(http).post(api(p)), token).send(body);

  /** Multipart cho C3, C4, B3, B4. */
  function form(
    method: 'post' | 'put',
    p: string,
    fields: Fields,
    files: { field: string; buffer: Buffer; png?: boolean }[] = [],
  ) {
    let req = auth(request(http)[method](api(p)));
    for (const [k, v] of Object.entries(fields)) req = req.field(k, String(v));
    for (const f of files) {
      req = req.attach(f.field, f.buffer, {
        filename: f.png ? 'anh.png' : 'anh.jpg',
        contentType: f.png ? 'image/png' : 'image/jpeg',
      });
    }
    return req;
  }

  /** Form bệnh tối thiểu (nháp) trên loại cây `a`. */
  const diseaseFields = (name: string, extra: Fields = {}): Fields => ({
    cropId: crop.a,
    name: `${P} ${name}`,
    pathogenGroup: 'FUNGUS',
    severity: 'MEDIUM',
    status: 'DRAFT',
    ...extra,
  });

  const content = {
    summary: 'Mô tả ngắn',
    symptoms: 'Đốm nâu',
    treatment: 'Phun thuốc',
  };

  async function createDisease(name: string, extra: Fields = {}) {
    const res = await form(
      'post',
      '/admin/diseases',
      diseaseFields(name, extra),
    ).expect(201);
    return res.body as { id: number; images: { id: number }[] };
  }

  async function labelRow(classCode: string) {
    const [row] = await db.query<
      {
        label_type: string;
        crop_id: number;
        disease_id: number | null;
        is_active: boolean;
      }[]
    >(
      `SELECT label_type, crop_id, disease_id, is_active FROM model_labels WHERE class_code = $1`,
      [classCode],
    );
    return row
      ? {
          ...row,
          crop_id: Number(row.crop_id),
          disease_id: row.disease_id === null ? null : Number(row.disease_id),
        }
      : undefined;
  }

  async function diseaseRow(id: number) {
    const [row] = await db.query<Record<string, unknown>[]>(
      `SELECT * FROM diseases WHERE id = $1`,
      [id],
    );
    return row;
  }

  async function imageKeys(diseaseId: number) {
    const rows = await db.query<{ image_url: string }[]>(
      `SELECT image_url FROM disease_images WHERE disease_id = $1 ORDER BY sort_order`,
      [diseaseId],
    );
    return rows.map((r) => r.image_url);
  }

  const stored = (key: unknown) =>
    existsSync(path.join(uploadDir, String(key)));

  async function register(key: string) {
    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: `Quản Trị Danh Mục ${key}`,
        email: `${EMAIL_PREFIX}-${key}@example.test`,
        password: 'matkhau1',
        confirmPassword: 'matkhau1',
      })
      .expect(201);
    const token = res.body.accessToken as string;
    const id = Number(app.get(JwtService).decode<{ sub: number }>(token).sub);
    return { id, token };
  }

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const env = validateEnv(process.env);
    const { AppModule } = await import('../src/app.module.js');
    uploadDir = await mkdtemp(path.join(os.tmpdir(), 'e2e-cat-uploads-'));
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
        [`${CODE}${key}`, `${P} cây ${key}`],
      );
      return Number(row.id);
    };
    crop.a = await insertCrop('A');
    crop.b = await insertCrop('B');
  });

  afterAll(async () => {
    if (db) {
      const run = (sql: string, params: unknown[]) =>
        db.query(sql, params).catch(() => undefined);
      await run(`DELETE FROM diagnoses WHERE user_id = ANY($1)`, [
        [user.id, admin.id].filter(Boolean),
      ]);
      await run(`DELETE FROM model_labels WHERE class_code LIKE $1`, [
        `${LP}_%`,
      ]);
      await run(
        `DELETE FROM diseases WHERE crop_id IN (SELECT id FROM crops WHERE code LIKE $1)`,
        [`${CODE}%`],
      );
      await run(`DELETE FROM crops WHERE code LIKE $1`, [`${CODE}%`]);
      await run(`DELETE FROM users WHERE email LIKE $1`, [`${EMAIL_PREFIX}-%`]);
    }
    await app?.close();
    if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  });

  describe('Phân quyền (specs mục 6)', () => {
    it.each([
      ['GET', '/admin/crops'],
      ['GET', '/admin/diseases'],
      ['GET', '/admin/diseases/related?cropId=1&pathogenGroup=FUNGUS'],
      ['GET', '/admin/labels/model'],
      ['POST', '/admin/labels/sync'],
    ])('USER gọi %s %s: 403', async (method, p) => {
      const req =
        method === 'GET'
          ? get(p, user.token)
          : auth(request(http).post(api(p)), user.token);
      const res = await req.expect(403);
      expect(res.body).toMatchObject({
        code: 'FORBIDDEN',
        message: MSG.FORBIDDEN,
      });
    });

    it('chưa đăng nhập: 401', async () => {
      await request(http).get(api('/admin/crops')).expect(401);
    });
  });

  describe('Loại cây C1 → C5 (US-06, BR-11 → 13)', () => {
    const newCode = `${CODE}N`;
    let created = 0;

    it('C3 thêm loại cây kèm ảnh, chu kỳ, mã lớp khoẻ mạnh (cùng giao dịch)', async () => {
      const res = await form(
        'post',
        '/admin/crops',
        {
          code: newCode,
          name: `  ${P} cây mới `,
          description: 'Mô tả',
          careGuide: 'Tưới đều',
          wateringIntervalDays: 3,
          fertilizingIntervalDays: '',
          healthyClassCode: `${LP}_healthyN`,
        },
        [{ field: 'image', buffer: PNG, png: true }],
      ).expect(201);
      created = res.body.id as number;
      expect(res.body).toMatchObject({
        code: newCode,
        name: `${P} cây mới`,
        status: 'ACTIVE',
        careGuide: 'Tưới đều',
        wateringIntervalDays: 3,
        fertilizingIntervalDays: null,
        healthyClassCode: `${LP}_healthyN`,
        diseaseCount: 0,
      });
      expect(res.body.imageUrl).toMatch(/\/crops\//);
      expect(await labelRow(`${LP}_healthyN`)).toMatchObject({
        label_type: 'HEALTHY',
        crop_id: created,
        disease_id: null,
        is_active: true,
      });
    });

    it('C3 thiếu mã, tên: câu C4 6.1 theo từng trường', async () => {
      const res = await form('post', '/admin/crops', {
        code: '',
        name: ' ',
      }).expect(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'code', message: MSG.REQUIRED },
          { field: 'name', message: MSG.REQUIRED },
        ]),
      );
    });

    it('C3 trùng mã, trùng tên (không phân biệt hoa thường): 409, ảnh không bị giữ lại', async () => {
      const before = await readdir(uploadDir, { recursive: true });
      const dupCode = await form(
        'post',
        '/admin/crops',
        { code: newCode, name: `${P} khác` },
        [{ field: 'image', buffer: JPG }],
      ).expect(409);
      expect(dupCode.body).toMatchObject({
        code: 'CROP_CODE_TAKEN',
        message: MSG.CROP_CODE_TAKEN,
        errors: [{ field: 'code', message: MSG.CROP_CODE_TAKEN }],
      });
      const dupName = await form('post', '/admin/crops', {
        code: `${CODE}M`,
        name: `${P} CÂY MỚI`,
      }).expect(409);
      expect(dupName.body.code).toBe('CROP_NAME_TAKEN');
      const after = await readdir(uploadDir, { recursive: true });
      expect(after.length).toBe(before.length);
    });

    it('C1 liệt kê cả loại cây đang ẩn, kèm số bệnh và mã lớp khoẻ mạnh', async () => {
      const res = await get('/admin/crops').expect(200);
      const mine = (res.body as { id: number }[]).find((c) => c.id === created);
      expect(mine).toMatchObject({
        healthyClassCode: `${LP}_healthyN`,
        diseaseCount: 0,
        publishedDiseaseCount: 0,
      });
    });

    it('C4 sửa: đổi mã lớp khoẻ mạnh thì tắt nhãn cũ; bỏ ảnh thì xoá tệp', async () => {
      const before = await get(`/admin/crops/${created}`).expect(200);
      const oldKey = (
        await db.query<{ image_url: string }[]>(
          `SELECT image_url FROM crops WHERE id = $1`,
          [created],
        )
      )[0].image_url;
      expect(stored(oldKey)).toBe(true);

      const res = await form('put', `/admin/crops/${created}`, {
        code: newCode,
        name: before.body.name as string,
        wateringIntervalDays: 4,
        healthyClassCode: `${LP}_healthyN2`,
        removeImage: 'true',
      }).expect(200);
      expect(res.body).toMatchObject({
        imageUrl: null,
        wateringIntervalDays: 4,
        careGuide: null,
        healthyClassCode: `${LP}_healthyN2`,
      });
      expect(stored(oldKey)).toBe(false);
      expect((await labelRow(`${LP}_healthyN`))?.is_active).toBe(false);
      expect((await labelRow(`${LP}_healthyN2`))?.is_active).toBe(true);
    });

    it('C2 không có: 404 CROP_NOT_FOUND', async () => {
      const res = await get('/admin/crops/999999999').expect(404);
      expect(res.body).toMatchObject({
        code: 'CROP_NOT_FOUND',
        message: MSG.NOT_FOUND,
      });
    });
  });

  describe('Bệnh B1 → B6 (US-01 → 05; BR-01 → 10)', () => {
    it('B3 thêm nháp kèm 2 ảnh theo thứ tự, chú thích, mã lớp mới', async () => {
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Đốm lá', {
          classCode: `${LP}_spot`,
          isFeatured: 'true',
          recheckDays: 7,
          imageLayout: JSON.stringify([
            { upload: 1, caption: 'Ảnh bìa' },
            { upload: 0 },
          ]),
        }),
        [
          { field: 'images', buffer: JPG },
          { field: 'images', buffer: PNG, png: true },
        ],
      ).expect(201);
      expect(res.body).toMatchObject({
        name: `${P} Đốm lá`,
        status: 'DRAFT',
        publishedAt: null,
        isFeatured: true,
        recheckDays: 7,
        classCode: `${LP}_spot`,
        cropLocked: true,
        crop: { id: crop.a },
      });
      expect(res.body.images).toHaveLength(2);
      expect(res.body.images[0].caption).toBe('Ảnh bìa');
      expect(res.body.images[0].url).toMatch(/\.png$/);
      expect(res.body.images[1].caption).toBeNull();
      expect(await labelRow(`${LP}_spot`)).toMatchObject({
        label_type: 'DISEASE',
        crop_id: crop.a,
        disease_id: res.body.id,
        is_active: true,
      });
    });

    it('B3 chọn "Công khai" mà thiếu nội dung: lỗi từng trường (BR-06)', async () => {
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Thiếu nội dung', { status: 'PUBLISHED' }),
      ).expect(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'summary', message: MSG.REQUIRED },
          { field: 'symptoms', message: MSG.REQUIRED },
          { field: 'treatment', message: MSG.REQUIRED },
        ]),
      );
    });

    it('B3 công khai đủ nội dung: đặt published_at', async () => {
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Công khai ngay', { status: 'PUBLISHED', ...content }),
      ).expect(201);
      expect(res.body.status).toBe('PUBLISHED');
      expect(res.body.publishedAt).not.toBeNull();
      expect(res.body.cropLocked).toBe(false);
    });

    it('B3 trùng tên trong loại cây (không phân biệt hoa thường): 409', async () => {
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('ĐỐM LÁ'),
      ).expect(409);
      expect(res.body).toMatchObject({
        code: 'DISEASE_NAME_TAKEN',
        errors: [{ field: 'name', message: MSG.NAME_TAKEN }],
      });
      // Cùng tên ở loại cây khác thì được (BR-05).
      await form(
        'post',
        '/admin/diseases',
        diseaseFields('Đốm lá', { cropId: crop.b }),
      ).expect(201);
    });

    it('B3 mã lớp đang gán cho bệnh khác: câu C4 6.2 có tên bệnh, không tạo gì', async () => {
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Trùng mã', { classCode: `${LP}_spot` }),
      ).expect(409);
      expect(res.body).toMatchObject({
        code: 'LABEL_ASSIGNED',
        message: `Mã lớp này đã được gán cho bệnh ${P} Đốm lá`,
        errors: [{ field: 'classCode' }],
      });
      const [row] = await db.query<{ n: number }[]>(
        `SELECT COUNT(*)::int AS n FROM diseases WHERE name = $1`,
        [`${P} Trùng mã`],
      );
      expect(row.n).toBe(0);
    });

    it('B3 mã lớp đang là mã khoẻ mạnh của loại cây: 409 ✎', async () => {
      await db.query(
        `INSERT INTO model_labels (class_code, label_type, crop_id) VALUES ($1, 'HEALTHY', $2)`,
        [`${LP}_healthyA`, crop.a],
      );
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Mã khoẻ', { classCode: `${LP}_healthyA` }),
      ).expect(409);
      expect(res.body.message).toBe(
        `Mã lớp này đã được gán cho nhãn khoẻ mạnh của ${P} cây A`,
      );
    });

    it('B3 mã đã tắt của loại cây khác: 409 LABEL_OTHER_CROP ✎', async () => {
      await db.query(
        `INSERT INTO model_labels (class_code, label_type, crop_id, is_active) VALUES ($1, 'HEALTHY', $2, false)`,
        [`${LP}_oldB`, crop.b],
      );
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Mã cây khác', { classCode: `${LP}_oldB` }),
      ).expect(409);
      expect(res.body).toMatchObject({
        code: 'LABEL_OTHER_CROP',
        message: `Mã lớp này thuộc loại cây ${P} cây B`,
      });
    });

    it('B3 quá 10 ảnh: lỗi trường images; ảnh sai định dạng: câu C4, không giữ tệp', async () => {
      const many = Array.from({ length: 11 }, () => ({
        field: 'images',
        buffer: JPG,
      }));
      const tooMany = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Nhiều ảnh'),
        many,
      ).expect(400);
      expect(tooMany.body.errors).toEqual([
        { field: 'images', message: 'Tối đa 10 ảnh' },
      ]);

      const before = await readdir(uploadDir, { recursive: true });
      const gif = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Ảnh GIF', {
          imageLayout: JSON.stringify([{ upload: 0 }, { upload: 1 }]),
        }),
        [
          { field: 'images', buffer: JPG },
          { field: 'images', buffer: GIF },
        ],
      ).expect(400);
      expect(gif.body.message).toBe(MSG.IMAGE);
      const after = await readdir(uploadDir, { recursive: true });
      expect(after.length).toBe(before.length);
    });

    describe('B4 sửa', () => {
      let id = 0;
      let images: { id: number }[] = [];

      beforeAll(async () => {
        const res = await form(
          'post',
          '/admin/diseases',
          diseaseFields('Sửa bệnh', {
            classCode: `${LP}_edit1`,
            imageLayout: JSON.stringify([{ upload: 0 }, { upload: 1 }]),
          }),
          [
            { field: 'images', buffer: JPG },
            { field: 'images', buffer: JPG },
          ],
        ).expect(201);
        id = res.body.id as number;
        images = res.body.images as { id: number }[];
      });

      it('nháp → công khai; đổi thứ tự, gỡ một ảnh, thêm một ảnh; đổi mã lớp', async () => {
        const keys = await imageKeys(id);
        const res = await form(
          'put',
          `/admin/diseases/${id}`,
          diseaseFields('Sửa bệnh', {
            status: 'PUBLISHED',
            ...content,
            classCode: `${LP}_edit2`,
            imageLayout: JSON.stringify([
              { upload: 0, caption: 'Mới' },
              { id: images[1].id, caption: 'Cũ' },
            ]),
          }),
          [{ field: 'images', buffer: PNG, png: true }],
        ).expect(200);
        expect(res.body).toMatchObject({
          status: 'PUBLISHED',
          classCode: `${LP}_edit2`,
        });
        expect(res.body.publishedAt).not.toBeNull();
        expect(
          res.body.images.map((i: { caption: string }) => i.caption),
        ).toEqual(['Mới', 'Cũ']);
        expect(res.body.images[1].id).toBe(images[1].id);
        expect(stored(keys[0])).toBe(false);
        expect(stored(keys[1])).toBe(true);
        // Mã cũ chỉ tắt, vẫn trỏ bệnh để lịch sử đọc được (BR-19, OQ-55).
        expect(await labelRow(`${LP}_edit1`)).toMatchObject({
          is_active: false,
          disease_id: id,
        });
        expect((await labelRow(`${LP}_edit2`))?.is_active).toBe(true);
      });

      it('bệnh đã công khai: gửi status thì 400; xoá mô tả ngắn thì 400', async () => {
        const withStatus = await form(
          'put',
          `/admin/diseases/${id}`,
          diseaseFields('Sửa bệnh', { status: 'DRAFT', ...content }),
        ).expect(400);
        expect(withStatus.body).toMatchObject({
          code: 'DISEASE_STATUS_NOT_ALLOWED',
          message: MSG.STATUS,
        });
        const { status: _s, ...fields } = diseaseFields('Sửa bệnh', {
          ...content,
          summary: '',
        });
        const noSummary = await form(
          'put',
          `/admin/diseases/${id}`,
          fields,
        ).expect(400);
        expect(noSummary.body.errors).toEqual([
          { field: 'summary', message: MSG.REQUIRED },
        ]);
      });

      it('đã có nhãn thì không đổi được loại cây (OQ-55)', async () => {
        const { status: _s, ...fields } = diseaseFields('Sửa bệnh', {
          ...content,
          cropId: crop.b,
        });
        const res = await form('put', `/admin/diseases/${id}`, fields).expect(
          409,
        );
        expect(res.body).toMatchObject({
          code: 'DISEASE_CROP_LOCKED',
          errors: [{ field: 'cropId', message: MSG.CROP_LOCKED }],
        });
      });

      it('gán lại mã đã tắt (cùng loại cây) cho bệnh khác', async () => {
        const other = await createDisease('Nhận mã cũ', {
          classCode: `${LP}_edit1`,
        });
        expect(await labelRow(`${LP}_edit1`)).toMatchObject({
          is_active: true,
          disease_id: other.id,
        });
      });

      it('không gửi imageLayout: giữ nguyên ảnh', async () => {
        const { status: _s, ...fields } = diseaseFields('Sửa bệnh', {
          ...content,
          classCode: `${LP}_edit2`,
          pathogen: 'Nấm',
        });
        const res = await form('put', `/admin/diseases/${id}`, fields).expect(
          200,
        );
        expect(res.body.pathogen).toBe('Nấm');
        expect(res.body.images).toHaveLength(2);
      });

      it('B5 ẩn thì thư viện 404; hiện lại thì thấy; nháp không chuyển được', async () => {
        await postJson(`/admin/diseases/${id}/status`, {
          status: 'HIDDEN',
        }).expect(200);
        await get(`/diseases/${id}`, user.token).expect(404);
        const shown = await postJson(`/admin/diseases/${id}/status`, {
          status: 'PUBLISHED',
        }).expect(200);
        expect(shown.body.status).toBe('PUBLISHED');
        await get(`/diseases/${id}`, user.token).expect(200);

        const draft = await createDisease('Nháp B5');
        const res = await postJson(`/admin/diseases/${draft.id}/status`, {
          status: 'PUBLISHED',
        }).expect(400);
        expect(res.body.code).toBe('DISEASE_STATUS_NOT_ALLOWED');
      });

      it('B5 hiện bệnh thiếu nội dung: 400 DISEASE_CONTENT_REQUIRED', async () => {
        await postJson(`/admin/diseases/${id}/status`, {
          status: 'HIDDEN',
        }).expect(200);
        await db.query(`UPDATE diseases SET symptoms = NULL WHERE id = $1`, [
          id,
        ]);
        const res = await postJson(`/admin/diseases/${id}/status`, {
          status: 'PUBLISHED',
        }).expect(400);
        expect(res.body).toMatchObject({
          code: 'DISEASE_CONTENT_REQUIRED',
          message: MSG.REQUIRED,
        });
      });
    });

    it('B1 tìm theo tên, lọc loại cây, trạng thái; kèm mã lớp', async () => {
      const res = await get(
        `/admin/diseases?q=${encodeURIComponent(`${P} Đốm`)}&cropId=${crop.a}&status=DRAFT`,
      ).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({
        name: `${P} Đốm lá`,
        classCode: `${LP}_spot`,
        status: 'DRAFT',
        isFeatured: true,
        crop: { id: crop.a, status: 'ACTIVE' },
      });
      const paged = await get(
        `/admin/diseases?cropId=${crop.a}&pageSize=2&page=1`,
      ).expect(200);
      expect(paged.body.items).toHaveLength(2);
      expect(paged.body.total).toBeGreaterThan(2);
    });

    it('B7 bệnh liên quan theo tiêu chí, chỉ bệnh đang hiển thị', async () => {
      const visible = await createDisease('Liên quan', {
        status: 'PUBLISHED',
        ...content,
      });
      const res = await get(
        `/admin/diseases/related?cropId=${crop.a}&pathogenGroup=FUNGUS`,
      ).expect(200);
      const ids = (res.body as { id: number }[]).map((d) => d.id);
      expect(res.body.length).toBeLessThanOrEqual(4);
      expect(ids).toContain(visible.id);
      const excluded = await get(
        `/admin/diseases/related?cropId=${crop.a}&pathogenGroup=FUNGUS&excludeId=${visible.id}`,
      ).expect(200);
      expect(
        (excluded.body as { id: number }[]).map((d) => d.id),
      ).not.toContain(visible.id);
    });

    it('B6 xoá bệnh chưa có dữ liệu chẩn đoán: xoá nhãn, ảnh, tệp', async () => {
      const res = await form(
        'post',
        '/admin/diseases',
        diseaseFields('Xoá được', {
          classCode: `${LP}_del`,
          imageLayout: JSON.stringify([{ upload: 0 }]),
        }),
        [{ field: 'images', buffer: JPG }],
      ).expect(201);
      const keys = await imageKeys(res.body.id as number);
      await auth(
        request(http).delete(api(`/admin/diseases/${res.body.id}`)),
      ).expect(204);
      expect(await diseaseRow(res.body.id as number)).toBeUndefined();
      expect(await labelRow(`${LP}_del`)).toBeUndefined();
      expect(stored(keys[0])).toBe(false);
    });

    it('B6 bệnh đã có dữ liệu chẩn đoán: 409, giữ nguyên (BR-09)', async () => {
      const d = await createDisease('Có chẩn đoán', {
        classCode: `${LP}_used`,
      });
      const [label] = await db.query<{ id: number }[]>(
        `SELECT id FROM model_labels WHERE class_code = $1`,
        [`${LP}_used`],
      );
      const [diag] = await db.query<{ id: number }[]>(
        `INSERT INTO diagnoses (user_id, crop_id, original_image_url, processed_image_url,
           status, result_type, model_version, inference_ms, completed_at)
         VALUES ($1, $2, 'e2e/g.jpg', 'e2e/c.jpg', 'COMPLETED', 'UNCERTAIN', 'e2e', 5, now())
         RETURNING id`,
        [user.id, crop.a],
      );
      await db.query(
        `INSERT INTO diagnosis_predictions (diagnosis_id, label_id, probability, rank_no)
         VALUES ($1, $2, 0.3, 1)`,
        [diag.id, label.id],
      );
      const res = await auth(
        request(http).delete(api(`/admin/diseases/${d.id}`)),
      ).expect(409);
      expect(res.body).toMatchObject({
        code: 'DISEASE_HAS_DIAGNOSES',
        message: MSG.HAS_DIAGNOSES,
      });
      expect(await diseaseRow(d.id)).toBeDefined();
      expect((await labelRow(`${LP}_used`))?.is_active).toBe(true);
    });

    it('B2 không có: 404 DISEASE_NOT_FOUND', async () => {
      const res = await get('/admin/diseases/999999999').expect(404);
      expect(res.body.code).toBe('DISEASE_NOT_FOUND');
    });
  });

  describe('C5 ẩn, hiện loại cây (BR-12, OQ-56)', () => {
    it('ẩn kèm bệnh công khai, nháp giữ nguyên; hiện lại không tự hiện bệnh', async () => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO crops (code, name) VALUES ($1, $2) RETURNING id`,
        [`${CODE}H`, `${P} cây H`],
      );
      const cropId = Number(row.id);
      const pub = await createDisease('Bệnh công khai H', {
        cropId,
        status: 'PUBLISHED',
        ...content,
      });
      const draft = await createDisease('Bệnh nháp H', { cropId });

      const hidden = await postJson(`/admin/crops/${cropId}/status`, {
        status: 'HIDDEN',
      }).expect(200);
      expect(hidden.body).toMatchObject({
        hiddenDiseases: 1,
        crop: { status: 'HIDDEN', publishedDiseaseCount: 0, diseaseCount: 2 },
      });
      expect((await diseaseRow(pub.id)).status).toBe('HIDDEN');
      expect((await diseaseRow(draft.id)).status).toBe('DRAFT');

      const again = await postJson(`/admin/crops/${cropId}/status`, {
        status: 'HIDDEN',
      }).expect(200);
      expect(again.body.hiddenDiseases).toBe(0);

      const shown = await postJson(`/admin/crops/${cropId}/status`, {
        status: 'ACTIVE',
      }).expect(200);
      expect(shown.body.crop.status).toBe('ACTIVE');
      expect((await diseaseRow(pub.id)).status).toBe('HIDDEN');
    });
  });

  describe('Nhãn mô hình M1, M2 (US-07; BR-15, 19; TD-31 A)', () => {
    it('M1: mã đã gán, chưa gán; nhãn đang gán không còn trong mô hình là stale', async () => {
      await createDisease('Nhãn stale', { classCode: `${LP}_stale` });
      ai.labels = () => Promise.resolve([`${LP}_spot`, `${LP}_new`]);
      const res = await get('/admin/labels/model').expect(200);
      const items = res.body.items as {
        classCode: string;
        assigned: boolean;
        labelType: string | null;
        disease: { name: string } | null;
      }[];
      expect(items.map((i) => i.classCode)).toEqual([
        `${LP}_new`,
        `${LP}_spot`,
      ]);
      expect(items[0]).toMatchObject({ assigned: false, labelType: null });
      expect(items[1]).toMatchObject({
        assigned: true,
        labelType: 'DISEASE',
        disease: { name: `${P} Đốm lá` },
      });
      const stale = (res.body.stale as { classCode: string }[]).map(
        (s) => s.classCode,
      );
      expect(stale).toContain(`${LP}_stale`);
      expect(stale).not.toContain(`${LP}_spot`);
    });

    it('M2: chỉ tắt nhãn không còn trong mô hình', async () => {
      ai.labels = async () =>
        (
          await db.query<{ class_code: string }[]>(
            `SELECT class_code FROM model_labels WHERE is_active AND class_code <> $1`,
            [`${LP}_stale`],
          )
        ).map((r) => r.class_code);
      const res = await auth(
        request(http).post(api('/admin/labels/sync')),
      ).expect(200);
      expect(res.body.deactivated).toBeGreaterThanOrEqual(1);
      expect((await labelRow(`${LP}_stale`))?.is_active).toBe(false);
      expect((await labelRow(`${LP}_spot`))?.is_active).toBe(true);
    });

    it('AI lỗi hoặc trả rỗng: 503 AI_LABELS_UNAVAILABLE', async () => {
      ai.labels = () =>
        Promise.reject(new AiServiceError('unavailable', 'AI tắt'));
      const res = await get('/admin/labels/model').expect(503);
      expect(res.body).toMatchObject({
        code: 'AI_LABELS_UNAVAILABLE',
        message: MSG.AI,
      });
      ai.labels = () => Promise.resolve([]);
      await auth(request(http).post(api('/admin/labels/sync'))).expect(503);
    });
  });
});
