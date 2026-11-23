import { fromParam, toParam } from "@/lib/history/dates"
import type { HistoryFilter, HistoryItem } from "@/lib/types/history"

import { api } from "./client"
import type { Paginated } from "./types"

/** Lời gọi API của feature `history` (docs/history/api_history.md). Chi tiết dùng D2. */
export const historyApi = {
  /** H1. */
  list: (
    filter: HistoryFilter,
    page: { page: number; pageSize: number },
    signal?: AbortSignal
  ) =>
    api.get<Paginated<HistoryItem>>("/diagnoses", {
      query: {
        q: filter.q.trim() || undefined,
        cropId: filter.cropId ?? undefined,
        resultType: filter.resultType ?? undefined,
        from: fromParam(filter.fromDate),
        to: toParam(filter.toDate),
        page: page.page,
        pageSize: page.pageSize,
      },
      signal,
    }),

  /** H2. Tất cả hoặc không (TD-27). */
  remove: (ids: number[]) => api.post<void>("/diagnoses/delete", { ids }),

  /** H3. Hoàn tác. */
  restore: (ids: number[]) => api.post<void>("/diagnoses/restore", { ids }),
}
