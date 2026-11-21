/**
 * Lớp bọc máy ảnh (fe-coding-rules mục 6, design/06). UI chỉ dùng interface này;
 * khi đóng gói Capacitor có thể thay bằng bản cài dùng plugin gốc (TD-02).
 */
export type CameraErrorKind =
  | "permission_denied" // người dùng từ chối quyền (specs_diagnosis BR-05)
  | "not_found" // thiết bị không có camera (BR-05)
  | "not_supported" // trình duyệt không hỗ trợ hoặc trang không chạy HTTPS
  | "unknown"

export class CameraError extends Error {
  constructor(
    readonly kind: CameraErrorKind,
    message: string
  ) {
    super(message)
    this.name = "CameraError"
  }
}

export interface CameraSession {
  /** Chụp khung hình hiện tại, độ phân giải gốc của camera. */
  capture(): Promise<Blob>
  stop(): void
}

export interface CameraService {
  isSupported(): boolean
  /** Mở camera (ưu tiên camera sau) và phát vào thẻ video. */
  start(video: HTMLVideoElement): Promise<CameraSession>
}
