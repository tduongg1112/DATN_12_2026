import type {
  CropSummary,
  DiseaseCard,
  DiseaseDetail,
  DiseaseListQuery,
} from "@/lib/types/library"

import { api } from "./client"
import type { Paginated } from "./types"

/** Lời gọi API của feature `disease_library` (docs/disease_library/api_disease_library.md). */
export const libraryApi = {
  /** L1. Loại cây đang hiển thị, theo thứ tự chip (BR-05). */
  crops: (signal?: AbortSignal) => api.get<CropSummary[]>("/crops", { signal }),

  /** L2. Trang chủ gọi trang 1 cỡ 6; "Xem tất cả" gọi theo bộ lọc. */
  diseases: (query: DiseaseListQuery, signal?: AbortSignal) =>
    api.get<Paginated<DiseaseCard>>("/diseases", {
      query: {
        cropId: query.cropId ?? undefined,
        q: query.q?.trim() || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    }),

  /** L3. */
  disease: (id: number, signal?: AbortSignal) =>
    api.get<DiseaseDetail>(`/diseases/${id}`, { signal }),
}
