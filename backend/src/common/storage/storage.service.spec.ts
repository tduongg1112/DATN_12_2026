import { LocalDiskStorage } from './local-disk.storage.js';
import { isExternalUrl } from './storage.service.js';

describe('StorageService.resolveUrl, deleteStored (TD-14)', () => {
  const storage = new LocalDiskStorage({
    rootDir: '/tmp/khong-dung-toi',
    publicBaseUrl: 'http://localhost:4000/uploads',
    maxBytes: 16,
  });

  it('khoá đối tượng → URL của kho; URL ngoài giữ nguyên; rỗng → null', async () => {
    await expect(storage.resolveUrl('avatars/2026/11/a.jpg')).resolves.toBe(
      'http://localhost:4000/uploads/avatars/2026/11/a.jpg',
    );
    await expect(
      storage.resolveUrl('https://lh3.googleusercontent.com/a/x'),
    ).resolves.toBe('https://lh3.googleusercontent.com/a/x');
    await expect(storage.resolveUrl(null)).resolves.toBeNull();
  });

  it('chỉ xoá ảnh do hệ thống giữ', async () => {
    const spy = vi.spyOn(storage, 'delete').mockResolvedValue();
    await storage.deleteStored('https://lh3.googleusercontent.com/a/x');
    await storage.deleteStored(null);
    expect(spy).not.toHaveBeenCalled();
    await storage.deleteStored('avatars/a.jpg');
    expect(spy).toHaveBeenCalledWith('avatars/a.jpg');
  });

  it('isExternalUrl', () => {
    expect(isExternalUrl('http://x')).toBe(true);
    expect(isExternalUrl('HTTPS://x')).toBe(true);
    expect(isExternalUrl('avatars/x.jpg')).toBe(false);
  });
});
