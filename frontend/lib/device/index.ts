import { webCamera } from "./web-camera"
import { webImageProcessor } from "./image"

export {
  CameraError,
  type CameraErrorKind,
  type CameraService,
  type CameraSession,
} from "./camera"
export {
  DEFAULT_COMPRESS,
  IMAGE_RULES,
  validateImageFile,
  type CompressOptions,
  type ImageProcessor,
} from "./image"

/**
 * Điểm truy cập duy nhất tới tính năng thiết bị (design/06 "Tính năng thiết bị").
 * Hiện là bản web; khi đóng gói Capacitor chỉ đổi bản cài ở đây.
 */
export const device = {
  camera: webCamera,
  images: webImageProcessor,
}
