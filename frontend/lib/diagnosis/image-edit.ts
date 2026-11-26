/**
 * Chỉnh ảnh trước khi chẩn đoán (BR-03; design/screens/diagnosis.md S3): cắt vuông, xoay
 * 90°, phóng to, độ sáng, độ tương phản. Chỉ dùng canvas, không thêm thư viện.
 * KHÔNG resize về 224×224: việc đó thuộc AI service (FL DIAG-02).
 */

export type Rotation = 0 | 90 | 180 | 270

export interface EditState {
  rotation: Rotation
  /** 1–3: cạnh vùng cắt = cạnh ngắn của ảnh (đã xoay) / zoom. */
  zoom: number
  /** Tâm vùng cắt, tỉ lệ 0–1 theo ảnh đã xoay. */
  centerX: number
  centerY: number
  /** Phần trăm, 50–150; 100 là giữ nguyên. */
  brightness: number
  contrast: number
}

export const EDIT_LIMITS = {
  zoom: { min: 1, max: 3, step: 0.1 },
  brightness: { min: 50, max: 150, step: 1 },
  contrast: { min: 50, max: 150, step: 1 },
} as const

export const INITIAL_EDIT: EditState = {
  rotation: 0,
  zoom: 1,
  centerX: 0.5,
  centerY: 0.5,
  brightness: 100,
  contrast: 100,
}

/** Cạnh tối đa của ảnh đã chỉnh (design/screens/diagnosis.md S3). */
export const PROCESSED_MAX_SIDE = 1600
/** Chất lượng JPEG của ảnh đã chỉnh. */
const PROCESSED_QUALITY = 0.9

export interface ImageSize {
  width: number
  height: number
}

export function rotatedSize(size: ImageSize, rotation: Rotation): ImageSize {
  return rotation === 90 || rotation === 270
    ? { width: size.height, height: size.width }
    : size
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Vùng cắt vuông (pixel, theo ảnh đã xoay), luôn nằm trọn trong ảnh. */
export function cropRect(
  state: EditState,
  size: ImageSize
): { x: number; y: number; side: number } {
  const { width, height } = rotatedSize(size, state.rotation)
  const side = Math.min(width, height) / state.zoom
  const cx = clamp(state.centerX * width, side / 2, width - side / 2)
  const cy = clamp(state.centerY * height, side / 2, height - side / 2)
  return { x: cx - side / 2, y: cy - side / 2, side }
}

/** Đưa tâm về vị trí hợp lệ (sau khi đổi zoom hoặc kéo quá mép). */
export function normalizeEdit(state: EditState, size: ImageSize): EditState {
  const { width, height } = rotatedSize(size, state.rotation)
  const { x, y, side } = cropRect(state, size)
  return {
    ...state,
    centerX: (x + side / 2) / width,
    centerY: (y + side / 2) / height,
  }
}

/**
 * Kéo ảnh một đoạn `dx`, `dy` tính theo tỉ lệ cạnh khung cắt (vd 0.1 = 10% khung). Ảnh đi
 * theo tay nên vùng cắt đi ngược lại.
 */
export function panEdit(
  state: EditState,
  size: ImageSize,
  dx: number,
  dy: number
): EditState {
  const { width, height } = rotatedSize(size, state.rotation)
  const { side } = cropRect(state, size)
  return normalizeEdit(
    {
      ...state,
      centerX: state.centerX - (dx * side) / width,
      centerY: state.centerY - (dy * side) / height,
    },
    size
  )
}

/** Xoay thêm 90° theo chiều kim đồng hồ; vùng cắt về giữa ảnh. */
export function rotateEdit(state: EditState): EditState {
  return {
    ...state,
    rotation: ((state.rotation + 90) % 360) as Rotation,
    centerX: 0.5,
    centerY: 0.5,
  }
}

/** Vẽ ảnh đã xoay vào hệ toạ độ hiện tại của ctx, chiếm [0, w'] × [0, h']. */
export function drawRotated(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & ImageSize,
  rotation: Rotation
): void {
  const { width: w, height: h } = image
  ctx.save()
  if (rotation === 90) {
    ctx.translate(h, 0)
    ctx.rotate(Math.PI / 2)
  } else if (rotation === 180) {
    ctx.translate(w, h)
    ctx.rotate(Math.PI)
  } else if (rotation === 270) {
    ctx.translate(0, w)
    ctx.rotate(-Math.PI / 2)
  }
  ctx.drawImage(image, 0, 0)
  ctx.restore()
}

/** Bộ lọc CSS cho ảnh xem trước; ảnh xuất dùng đúng công thức này (`applyTone`). */
export function cssFilter(state: EditState): string {
  return `brightness(${state.brightness / 100}) contrast(${state.contrast / 100})`
}

/**
 * Áp độ sáng rồi độ tương phản lên từng điểm ảnh, đúng công thức của `filter: brightness()
 * contrast()` (Filter Effects: brightness nhân hệ số; contrast c' = (c − 0.5)·k + 0.5).
 * Tự tính thay vì dùng `ctx.filter` để chạy được cả trên Safari cũ.
 */
export function applyTone(data: Uint8ClampedArray, state: EditState): void {
  const b = state.brightness / 100
  const k = state.contrast / 100
  if (b === 1 && k === 1) return
  const lut = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) {
    const bright = Math.min(1, (v / 255) * b)
    lut[v] = Math.round(((bright - 0.5) * k + 0.5) * 255)
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
  }
}

/**
 * Xuất ảnh đã chỉnh: vùng vuông sau khi xoay, áp sáng và tương phản, JPEG, cạnh tối đa
 * 1600 (BR-06).
 */
export async function exportEdited(
  image: ImageBitmap,
  state: EditState
): Promise<Blob> {
  const { x, y, side } = cropRect(state, image)
  const out = Math.max(1, Math.round(Math.min(side, PROCESSED_MAX_SIDE)))
  const scale = out / side
  const canvas = document.createElement("canvas")
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas")
  ctx.imageSmoothingQuality = "high"
  ctx.setTransform(scale, 0, 0, scale, -x * scale, -y * scale)
  drawRotated(ctx, image, state.rotation)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (state.brightness !== 100 || state.contrast !== 100) {
    const pixels = ctx.getImageData(0, 0, out, out)
    applyTone(pixels.data, state)
    ctx.putImageData(pixels, 0, 0)
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", PROCESSED_QUALITY)
  )
  if (!blob) throw new Error("Không xuất được ảnh")
  return blob
}
