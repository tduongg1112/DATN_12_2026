import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AppException } from '../exceptions/app.exception.js';
import { detectImageType, INVALID_IMAGE_MESSAGE } from './image-validation.js';
import { LocalDiskStorage } from './local-disk.storage.js';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]);
const GIF = Buffer.from('GIF89a....');

describe('detectImageType', () => {
  it('nhận JPG, PNG theo magic bytes; từ chối định dạng khác', () => {
    expect(detectImageType(JPG)).toBe('image/jpeg');
    expect(detectImageType(PNG)).toBe('image/png');
    expect(detectImageType(GIF)).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('LocalDiskStorage (TD-01, dev)', () => {
  let root: string;
  let storage: LocalDiskStorage;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'storage-spec-'));
    storage = new LocalDiskStorage({
      rootDir: root,
      publicBaseUrl: 'http://localhost:4000/uploads/',
      maxBytes: 16,
    });
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it('lưu ảnh, trả key theo thư mục nghiệp vụ và URL công khai', async () => {
    const f = await storage.saveImage(PNG, 'diagnoses');
    expect(f.key).toMatch(/^diagnoses\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(f.url).toBe(`http://localhost:4000/uploads/${f.key}`);
    expect(f).toMatchObject({ contentType: 'image/png', size: PNG.length });
    expect(await readFile(path.join(root, f.key))).toEqual(PNG);
  });

  it('ảnh vừa đúng giới hạn thì nhận, vượt 1 byte thì từ chối với câu của C4', async () => {
    await expect(
      storage.saveImage(Buffer.concat([JPG, Buffer.alloc(9)]), 'plants'),
    ).resolves.toBeDefined();
    const e = await storage
      .saveImage(Buffer.concat([JPG, Buffer.alloc(10)]), 'plants')
      .catch((err: unknown) => err);
    expect(e).toBeInstanceOf(AppException);
    expect((e as AppException).getResponse()).toMatchObject({
      statusCode: 400,
      code: 'IMAGE_TOO_LARGE',
      message: INVALID_IMAGE_MESSAGE,
    });
  });

  it('không phải JPG/PNG: INVALID_IMAGE_TYPE', async () => {
    const e = await storage
      .saveImage(GIF, 'avatars')
      .catch((err: unknown) => err);
    expect((e as AppException).code).toBe('INVALID_IMAGE_TYPE');
  });

  it('xoá được file đã lưu; chặn key thoát khỏi thư mục gốc', async () => {
    const f = await storage.saveImage(JPG, 'crops');
    await storage.delete(f.key);
    await expect(stat(path.join(root, f.key))).rejects.toThrow();
    await expect(storage.delete('../outside.jpg')).rejects.toThrow(
      /không hợp lệ/,
    );
  });
});
