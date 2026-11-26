import { existsSync } from 'node:fs';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/configure-app.js';
import {
  AiClient,
  type AiPredictInput,
  type AiPredictResult,
} from '../src/modules/diagnosis/ai/ai-client.js';
import { ReminderJob } from '../src/modules/plants/reminder.job.js';

/**
 * E2E feature my_plants đợt 2 (docs/my_plants/api_my_plants.md R1, R2, N1 → N4, J1; gợi ý
 * nhắc trong P2, A1, A2, D1). Chạy trên PostgreSQL thật (đã chạy migration).
 *
 * - Tắt job tự chạy (`REMINDER_JOB_ENABLED=false`), gọi `ReminderJob.run(now)` trực tiếp.
 *   Job xử lý mọi nhắc đến hạn trong CSDL, nên test chỉ kiểm tra dữ liệu của chính nó.
 * - Dữ liệu riêng: loại cây A (tưới 2, bón 14 ngày), B (không có chu kỳ); bệnh có và không
 *   có `recheck_days`; 2 người dùng và 1 ADMIN. Mang tiền tố của lần chạy, xoá ở afterAll.
 */
const RUN = Date.now();
const P = `E2E-REM ${RUN}`;
const EMAIL_PREFIX = `e2e-rem-${RUN}`;
const LP = `E2E_REM_${RUN}`;
const DAY = 24 * 60 * 60 * 1000;
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 4]);

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

interface Reminder {
  id: number;
  type: string;
  title: string;
  nextRemindAt: string;
  repeatDays: number | null;
  source: string;
}

describe('Reminders & notifications (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let job: ReminderJob;
  const ai = new FakeAiClient();

  const user = { id: 0, token: '' };
  const other = { id: 0, token: '' };
  const admin = { id: 0, token: '' };
  const crop = { a: 0, b: 0 };
  const label = { healthyA: 0, mold: 0, noRecheck: 0 };

  const api = (p: string) => `/api/v1${p}`;
  const auth = (req: request.Test, token = user.token) =>
    req.set('Authorization', `Bearer ${token}`);
  const get = (p: string, token = user.token) =>
    auth(request(http).get(api(p)), token);
  const post = (p: string, body: object = {}, token = user.token) =>
    auth(request(http).post(api(p)), token).send(body);

  async function register(key: string) {
    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: `Người Dùng Nhắc ${key}`,
        email: `${EMAIL_PREFIX}-${key}@example.test`,
        password: 'matkhau1',
        confirmPassword: 'matkhau1',
      })
      .expect(201);
    const token = res.body.accessToken as string;
    const id = Number(app.get(JwtService).decode<{ sub: number }>(token).sub);
    return { id, token };
  }

  async function insertPlant(
    name: string,
    o: { userId?: number; cropId?: number; health?: string } = {},
  ) {
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO plants (user_id, crop_id, name, health_status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        o.userId ?? user.id,
        o.cropId ?? crop.a,
        `${P} ${name}`,
        o.health ?? 'NOT_DIAGNOSED',
      ],
    );
    return Number(row.id);
  }

  async function insertDiagnosis(
    labelId: number,
    resultType: 'DISEASE' | 'HEALTHY',
    plantId: number | null = null,
  ) {
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO diagnoses (user_id, crop_id, plant_id, original_image_url, processed_image_url,
         status, result_type, model_version, inference_ms, completed_at)
       VALUES ($1, $2, $3, 'e2e/g.jpg', 'e2e/c.jpg', 'COMPLETED', $4, 'e2e', 5, now())
       RETURNING id`,
      [user.id, crop.a, plantId, resultType],
    );
    await db.query(
      `INSERT INTO diagnosis_predictions (diagnosis_id, label_id, probability, rank_no)
       VALUES ($1, $2, 0.9, 1)`,
      [Number(row.id), labelId],
    );
    return Number(row.id);
  }

  async function insertReminder(
    plantId: number,
    o: {
      type: string;
      nextAt: Date;
      repeatDays?: number | null;
      active?: boolean;
    },
  ) {
    const [row] = await db.query<{ id: number }[]>(
      `INSERT INTO reminders (plant_id, reminder_type, title, next_remind_at, repeat_days, source, is_active)
       VALUES ($1, $2, $3, $4, $5, 'USER', $6) RETURNING id`,
      [
        plantId,
        o.type,
        'Tiêu đề',
        o.nextAt,
        o.repeatDays ?? null,
        o.active ?? true,
      ],
    );
    return Number(row.id);
  }

  async function reminderRow(id: number) {
    const [row] = await db.query<
      {
        is_active: boolean;
        next_remind_at: Date;
        last_sent_at: Date | null;
      }[]
    >(
      `SELECT is_active, next_remind_at, last_sent_at FROM reminders WHERE id = $1`,
      [id],
    );
    return row;
  }

  async function noticesOf(reminderId: number) {
    return db.query<{ user_id: number; title: string; content: string }[]>(
      `SELECT user_id, title, content FROM notifications WHERE reminder_id = $1`,
      [reminderId],
    );
  }

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    process.env.REMINDER_JOB_ENABLED = 'false';
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiClient)
      .useValue(ai)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    db = app.get(DataSource);
    job = app.get(ReminderJob);

    Object.assign(user, await register('user'));
    Object.assign(other, await register('other'));
    // ADMIN: đổi vai trò rồi đăng nhập lại để access token mang role ADMIN.
    admin.id = (await register('admin')).id;
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [admin.id]);
    admin.token = (
      await request(http)
        .post(api('/auth/login'))
        .send({
          email: `${EMAIL_PREFIX}-admin@example.test`,
          password: 'matkhau1',
        })
        .expect(200)
    ).body.accessToken as string;

    const insertCrop = async (
      key: string,
      watering: number | null,
      fertilizing: number | null,
    ) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO crops (code, name, watering_interval_days, fertilizing_interval_days)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [`E2ER${RUN}${key}`, `${P} cây ${key}`, watering, fertilizing],
      );
      return Number(row.id);
    };
    crop.a = await insertCrop('A', 2, 14);
    crop.b = await insertCrop('B', null, null);

    const insertDisease = async (name: string, recheck: number | null) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO diseases (crop_id, name, pathogen_group, severity, recheck_days, status, published_at)
         VALUES ($1, $2, 'FUNGUS', 'HIGH', $3, 'PUBLISHED', now()) RETURNING id`,
        [crop.a, `${P} ${name}`, recheck],
      );
      return Number(row.id);
    };
    const mold = await insertDisease('mốc', 7);
    const noRecheck = await insertDisease('không hẹn', null);
    const insertLabel = async (key: string, diseaseId: number | null) => {
      const [row] = await db.query<{ id: number }[]>(
        `INSERT INTO model_labels (class_code, label_type, crop_id, disease_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [`${LP}_${key}`, diseaseId ? 'DISEASE' : 'HEALTHY', crop.a, diseaseId],
      );
      return Number(row.id);
    };
    label.healthyA = await insertLabel('healthyA', null);
    label.mold = await insertLabel('mold', mold);
    label.noRecheck = await insertLabel('noRecheck', noRecheck);
  });

  afterAll(async () => {
    if (db) {
      const users = [user.id, other.id, admin.id].filter(Boolean);
      const crops = [crop.a, crop.b].filter(Boolean);
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
  });

  // --- Gợi ý nhắc -----------------------------------------------------------------

  describe('Gợi ý nhắc (BR-16, BR-18; diagnosis BR-26, 27)', () => {
    it('P2: cây loại có chu kỳ thì gợi ý tưới, bón; không có chu kỳ thì không gợi ý', async () => {
      const a = await auth(request(http).post(api('/plants')))
        .field('name', 'Có chu kỳ')
        .field('cropId', String(crop.a))
        .expect(201);
      expect(a.body.suggestions).toEqual([
        { type: 'WATERING', days: 2 },
        { type: 'FERTILIZING', days: 14 },
      ]);
      const b = await auth(request(http).post(api('/plants')))
        .field('name', 'Không chu kỳ')
        .field('cropId', String(crop.b))
        .expect(201);
      expect(b.body.suggestions).toEqual([]);
    });

    it('A1: gắn lượt bệnh có recheck_days thì gợi ý kiểm tra lại; bệnh không có số ngày thì không', async () => {
      const p1 = await insertPlant('gắn bệnh');
      const d1 = await insertDiagnosis(label.mold, 'DISEASE');
      const r1 = await post(`/diagnoses/${d1}/plant`, { plantId: p1 }).expect(
        200,
      );
      expect(r1.body.suggestions).toEqual([{ type: 'RECHECK', days: 7 }]);

      const p2 = await insertPlant('bệnh không hẹn');
      const d2 = await insertDiagnosis(label.noRecheck, 'DISEASE');
      const r2 = await post(`/diagnoses/${d2}/plant`, { plantId: p2 }).expect(
        200,
      );
      expect(r2.body.suggestions).toEqual([]);
    });

    it('A1: cây đã có nhắc kiểm tra lại đang bật thì không gợi ý trùng', async () => {
      const plantId = await insertPlant('đã có nhắc');
      await insertReminder(plantId, {
        type: 'RECHECK',
        nextAt: new Date(Date.now() + 3 * DAY),
      });
      const d = await insertDiagnosis(label.mold, 'DISEASE');
      const res = await post(`/diagnoses/${d}/plant`, { plantId }).expect(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('A2: tạo cây từ lượt bệnh thì gợi ý tưới, bón và kiểm tra lại', async () => {
      const d = await insertDiagnosis(label.mold, 'DISEASE');
      const res = await auth(
        request(http).post(api(`/diagnoses/${d}/new-plant`)),
      )
        .field('name', 'Từ kết quả')
        .field('cropId', String(crop.a))
        .expect(201);
      expect(res.body.suggestions).toEqual([
        { type: 'WATERING', days: 2 },
        { type: 'FERTILIZING', days: 14 },
        { type: 'RECHECK', days: 7 },
      ]);
    });

    it('D1 chẩn đoán từ hồ sơ cây: plantLink có gợi ý kiểm tra lại', async () => {
      const plantId = await insertPlant('chẩn đoán lại');
      ai.classCode = `${LP}_mold`;
      const res = await auth(request(http).post(api('/diagnoses')))
        .field('cropId', String(crop.a))
        .field('plantId', String(plantId))
        .attach('original', JPG, {
          filename: 'g.jpg',
          contentType: 'image/jpeg',
        })
        .attach('processed', JPG, {
          filename: 'c.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);
      expect(res.body.plantLink.suggestions).toEqual([
        { type: 'RECHECK', days: 7 },
      ]);
    });
  });

  // --- R1, R2 ------------------------------------------------------------------

  describe('R1 nhắc kiểm tra lại, R2 tạo nhắc gợi ý (BR-14, 16, 18)', () => {
    it('R1: sau 3 ngày, một lần, source USER; hiện ở chi tiết cây', async () => {
      const plantId = await insertPlant('nhắc tay');
      const before = Date.now();
      const res = await post(`/plants/${plantId}/reminders/recheck`, {
        days: 3,
      }).expect(201);
      expect(res.body).toMatchObject({
        type: 'RECHECK',
        title: 'Kiểm tra lại cây',
        repeatDays: null,
        source: 'USER',
      });
      const at = new Date(res.body.nextRemindAt as string).getTime();
      expect(at).toBeGreaterThanOrEqual(before + 3 * DAY - 1000);
      expect(at).toBeLessThanOrEqual(Date.now() + 3 * DAY + 1000);
      const detail = await get(`/plants/${plantId}`).expect(200);
      expect((detail.body.reminders as Reminder[]).map((r) => r.id)).toEqual([
        res.body.id,
      ]);
    });

    it('R1: số ngày khác 3, 7, 14 thì 400; cây của người khác thì 404', async () => {
      const plantId = await insertPlant('nhắc sai');
      const res = await post(`/plants/${plantId}/reminders/recheck`, {
        days: 5,
      }).expect(400);
      expect(res.body.errors).toEqual([
        { field: 'days', message: 'Dữ liệu không hợp lệ' },
      ]);
      const theirs = await insertPlant('của người khác', { userId: other.id });
      await post(`/plants/${theirs}/reminders/recheck`, { days: 3 }).expect(
        404,
      );
    });

    it('R2: tạo tưới, bón lặp, source SYSTEM; gọi lại không tạo trùng', async () => {
      const plantId = await insertPlant('nhận gợi ý');
      const res = await post(`/plants/${plantId}/reminders/suggested`, {
        types: ['WATERING', 'FERTILIZING'],
      }).expect(201);
      expect(
        (res.body as Reminder[]).map((r) => [r.type, r.repeatDays, r.source]),
      ).toEqual([
        ['WATERING', 2, 'SYSTEM'],
        ['FERTILIZING', 14, 'SYSTEM'],
      ]);
      const again = await post(`/plants/${plantId}/reminders/suggested`, {
        types: ['WATERING', 'FERTILIZING'],
      }).expect(201);
      expect(again.body).toEqual([]);
    });

    it('R2: kiểm tra lại chỉ tạo khi cây đang có bệnh, theo bệnh đang mắc', async () => {
      const sick = await insertPlant('đang bệnh', { health: 'DISEASED' });
      await insertDiagnosis(label.mold, 'DISEASE', sick);
      const res = await post(`/plants/${sick}/reminders/suggested`, {
        types: ['RECHECK'],
      }).expect(201);
      expect(res.body).toMatchObject([
        { type: 'RECHECK', repeatDays: null, source: 'SYSTEM' },
      ]);

      const healthy = await insertPlant('đã khoẻ', { health: 'HEALTHY' });
      await insertDiagnosis(label.mold, 'DISEASE', healthy);
      const none = await post(`/plants/${healthy}/reminders/suggested`, {
        types: ['RECHECK'],
      }).expect(201);
      expect(none.body).toEqual([]);
    });

    it('R2: types rỗng, trùng hoặc lạ: 400', async () => {
      const plantId = await insertPlant('gợi ý sai');
      for (const types of [[], ['WATERING', 'WATERING'], ['OTHER']]) {
        await post(`/plants/${plantId}/reminders/suggested`, {
          types,
        }).expect(400);
      }
    });
  });

  // --- J1 --------------------------------------------------------------------------

  describe('J1 job gửi nhắc (BR-15, TD-28)', () => {
    it('nhắc một lần đến hạn: tạo thông báo cho chủ cây rồi tắt; lặp trễ nhiều chu kỳ chỉ gửi một thông báo', async () => {
      const plantId = await insertPlant('Cây tưới');
      const now = new Date();
      const once = await insertReminder(plantId, {
        type: 'RECHECK',
        nextAt: new Date(now.getTime() - 60_000),
      });
      const start = new Date(now.getTime() - 7 * DAY);
      const repeat = await insertReminder(plantId, {
        type: 'WATERING',
        nextAt: start,
        repeatDays: 2,
      });
      const future = await insertReminder(plantId, {
        type: 'FERTILIZING',
        nextAt: new Date(now.getTime() + DAY),
        repeatDays: 14,
      });
      const off = await insertReminder(plantId, {
        type: 'OTHER',
        nextAt: new Date(now.getTime() - DAY),
        active: false,
      });

      await job.run(now);

      expect(await noticesOf(once)).toEqual([
        {
          user_id: user.id,
          title: `Đến lúc kiểm tra lại ${P} Cây tưới`,
          content: `Hãy chụp lại ${P} Cây tưới để theo dõi tiến triển của cây.`,
        },
      ]);
      expect(await reminderRow(once)).toMatchObject({
        is_active: false,
        last_sent_at: expect.any(Date),
      });

      expect(await noticesOf(repeat)).toHaveLength(1);
      const r = await reminderRow(repeat);
      expect(r.is_active).toBe(true);
      expect(r.next_remind_at.getTime()).toBe(start.getTime() + 8 * DAY);

      expect(await noticesOf(future)).toHaveLength(0);
      expect(await noticesOf(off)).toHaveLength(0);

      // Chạy lại ngay: không gửi trùng.
      await job.run(now);
      expect(await noticesOf(once)).toHaveLength(1);
      expect(await noticesOf(repeat)).toHaveLength(1);
    });
  });

  // --- N1 → N4 ---------------------------------------------------------------------

  describe('N1 → N4 thông báo (BR-17, BR-19)', () => {
    let plantId: number;
    beforeAll(async () => {
      plantId = await insertPlant('thông báo');
      for (let i = 0; i < 2; i++) {
        await insertReminder(plantId, {
          type: 'RECHECK',
          nextAt: new Date(Date.now() - (i + 1) * 60_000),
        });
      }
      await job.run(new Date());
    });

    it('chưa đăng nhập: 401', async () => {
      await request(http).get(api('/notifications')).expect(401);
      await request(http).get(api('/notifications/unread-count')).expect(401);
    });

    it('N1: chỉ thông báo của mình, mới nhất trước, có plantId và số chưa đọc', async () => {
      const res = await get('/notifications?pageSize=50').expect(200);
      const mine = (res.body.items as { plantId: number | null }[]).filter(
        (n) => n.plantId === plantId,
      );
      expect(mine).toHaveLength(2);
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(2);
      expect(res.body.items[0]).toEqual({
        id: expect.any(Number),
        title: expect.any(String),
        content: expect.any(String),
        isRead: false,
        createdAt: expect.any(String),
        plantId: expect.anything(),
      });
      const theirs = await get('/notifications', other.token).expect(200);
      expect(
        (theirs.body.items as { plantId: number | null }[]).some(
          (n) => n.plantId === plantId,
        ),
      ).toBe(false);
    });

    it('N3: đánh dấu một thông báo; của người khác thì 404; N2 giảm theo', async () => {
      const list = await get('/notifications').expect(200);
      const before = (await get('/notifications/unread-count').expect(200)).body
        .count as number;
      const id = list.body.items[0].id as number;
      await post(`/notifications/${id}/read`).expect(204);
      await post(`/notifications/${id}/read`).expect(204);
      const after = (await get('/notifications/unread-count').expect(200)).body
        .count as number;
      expect(after).toBe(before - 1);
      const res = await post(
        `/notifications/${id}/read`,
        {},
        other.token,
      ).expect(404);
      expect(res.body.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('N4: đánh dấu tất cả; người khác không bị ảnh hưởng', async () => {
      await post('/notifications/read-all').expect(204);
      expect((await get('/notifications/unread-count')).body.count).toBe(0);
    });

    it('xoá cây: thông báo còn, plantId thành null (BR-11)', async () => {
      await auth(request(http).delete(api(`/plants/${plantId}`))).expect(204);
      const res = await get('/notifications?pageSize=50').expect(200);
      expect(
        (res.body.items as { plantId: number | null }[]).some(
          (n) => n.plantId === plantId,
        ),
      ).toBe(false);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });
  });

  // --- ADMIN dùng chức năng người dùng ----------------------------------------------

  describe('ADMIN dùng nhắc việc và thông báo như USER (OQ-22)', () => {
    it('R1, R2 trên cây của mình; cây của người khác thì 404', async () => {
      const mine = await insertPlant('cây của ADMIN', { userId: admin.id });
      await post(
        `/plants/${mine}/reminders/recheck`,
        { days: 7 },
        admin.token,
      ).expect(201);
      const suggested = await post(
        `/plants/${mine}/reminders/suggested`,
        { types: ['WATERING'] },
        admin.token,
      ).expect(201);
      expect(suggested.body).toMatchObject([{ type: 'WATERING' }]);

      const theirs = await insertPlant('cây của USER');
      await post(
        `/plants/${theirs}/reminders/recheck`,
        { days: 3 },
        admin.token,
      ).expect(404);
      await post(
        `/plants/${theirs}/reminders/suggested`,
        { types: ['WATERING'] },
        admin.token,
      ).expect(404);
    });

    it('N1 → N4: chỉ thông báo của mình; thông báo của USER thì 404', async () => {
      const mine = await insertPlant('ADMIN nhận nhắc', { userId: admin.id });
      await insertReminder(mine, {
        type: 'RECHECK',
        nextAt: new Date(Date.now() - 60_000),
      });
      const theirsPlant = await insertPlant('USER nhận nhắc');
      const theirsReminder = await insertReminder(theirsPlant, {
        type: 'RECHECK',
        nextAt: new Date(Date.now() - 60_000),
      });
      await job.run(new Date());

      const list = await get('/notifications?pageSize=50', admin.token).expect(
        200,
      );
      const items = list.body.items as { id: number; plantId: number | null }[];
      expect(items.filter((n) => n.plantId === mine)).toHaveLength(1);
      expect(items.some((n) => n.plantId === theirsPlant)).toBe(false);
      expect(
        (await get('/notifications/unread-count', admin.token).expect(200)).body
          .count,
      ).toBeGreaterThanOrEqual(1);

      const [theirNotice] = await db.query<{ id: number }[]>(
        `SELECT id FROM notifications WHERE reminder_id = $1`,
        [theirsReminder],
      );
      await post(
        `/notifications/${Number(theirNotice.id)}/read`,
        {},
        admin.token,
      ).expect(404);

      // Kiểm tra theo thông báo của test, không theo tổng: file e2e chẩn đoán chạy song song
      // có thể gửi thông báo nhãn lạ cho mọi ADMIN, kể cả ADMIN tạm của file này.
      await post('/notifications/read-all', {}, admin.token).expect(204);
      const after = await get('/notifications?pageSize=50', admin.token).expect(
        200,
      );
      expect(
        (after.body.items as { plantId: number | null; isRead: boolean }[])
          .filter((n) => n.plantId === mine)
          .map((n) => n.isRead),
      ).toEqual([true]);
      const [theirs] = await db.query<{ is_read: boolean }[]>(
        `SELECT is_read FROM notifications WHERE id = $1`,
        [Number(theirNotice.id)],
      );
      expect(theirs.is_read).toBe(false);
    });
  });
});
