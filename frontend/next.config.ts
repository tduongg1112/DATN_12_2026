import type { NextConfig } from "next"
import { PHASE_DEVELOPMENT_SERVER } from "next/constants"

const DEFAULT_EXTENSIONS = ["tsx", "ts", "jsx", "js"]

/**
 * Trang kiểm tra giao diện trong `app/dev/` đặt tên `page.dev.tsx`, chỉ được nhận
 * khi chạy `next dev`. Bản build production không chứa chúng (trả 404 tự nhiên).
 */
export default function config(phase: string): NextConfig {
  return {
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER
        ? ["dev.tsx", ...DEFAULT_EXTENSIONS]
        : DEFAULT_EXTENSIONS,
  }
}
