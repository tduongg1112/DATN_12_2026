/**
 * Kiểm tra và nén ảnh phía trình duyệt (design/06; fe-coding-rules mục 6).
 * KHÔNG resize về 224×224: việc đó thuộc AI service (FL DIAG-02).
 */

/** C4 UC02 4a, 5a1 (specs_diagnosis BR-04). */
export const IMAGE_RULES = {
  types: ["image/jpeg", "image/png"] as const,
  maxBytes: 10 * 1024 * 1024,
  message: "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB",
}

/** Trả câu lỗi theo C4 nếu ảnh không hợp lệ, null nếu hợp lệ. */
export function validateImageFile(file: Blob): string | null {
  const okType = (IMAGE_RULES.types as readonly string[]).includes(file.type)
  return okType && file.size <= IMAGE_RULES.maxBytes
    ? null
    : IMAGE_RULES.message
}

export interface CompressOptions {
  /** Cạnh dài tối đa sau khi nén (px). */
  maxDimension: number
  /** Chất lượng JPEG 0–1. */
  quality: number
}

/**
 * Tham số nén mặc định (đề xuất, chưa có trong tài liệu): giữ đủ chi tiết lá cho
 * AI service tự resize, nhưng giảm mạnh dung lượng ảnh điện thoại.
 */
export const DEFAULT_COMPRESS: CompressOptions = {
  maxDimension: 1600,
  quality: 0.85,
}

export interface ImageProcessor {
  /** Nén thành JPEG; nếu kết quả không nhỏ hơn ảnh gốc thì trả ảnh gốc. */
  compress(image: Blob, options?: Partial<CompressOptions>): Promise<Blob>
}

/** Bản cài trên trình duyệt: createImageBitmap (tự xoay theo EXIF) + canvas. */
export const webImageProcessor: ImageProcessor = {
  async compress(image, options) {
    const { maxDimension, quality } = { ...DEFAULT_COMPRESS, ...options }
    const bitmap = await createImageBitmap(image, {
      imageOrientation: "from-image",
    })
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      return image
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    )
    return blob && blob.size < image.size ? blob : image
  },
}
