import type { CreateDiagnosisResult } from "@/lib/types/diagnosis"

/*
 * Kết quả D1 vừa nhận, giữ trong bộ nhớ để màn kết quả hiện ngay, không gọi lại API
 * (design/screens/diagnosis.md S5). Chỉ giữ một kết quả gần nhất; tải lại trang thì mất,
 * màn kết quả gọi D2.
 */
let latest: CreateDiagnosisResult | null = null

export function rememberResult(result: CreateDiagnosisResult): void {
  latest = result
}

/** Kết quả đã giữ nếu đúng `id`, không thì `undefined`. */
export function rememberedResult(
  id: number
): CreateDiagnosisResult | undefined {
  return latest?.id === id ? latest : undefined
}
