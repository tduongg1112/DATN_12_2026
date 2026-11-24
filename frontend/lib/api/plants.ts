import type {
  ManualStatus,
  PlantCard,
  PlantDetail,
  PlantFormValues,
  PlantLogView,
  ReminderSuggestion,
} from "@/lib/types/plants"

import { api } from "./client"
import type { Paginated } from "./types"

function imageName(name: string, blob: Blob): string {
  return `${name}.${blob.type === "image/png" ? "png" : "jpg"}`
}

/**
 * Form thêm, sửa cây (P2, P4, A2). `forUpdate`: gửi chuỗi rỗng để xoá ngày trồng, ghi chú;
 * khi thêm thì bỏ qua trường trống.
 */
export function plantFormData(
  values: PlantFormValues,
  forUpdate = false
): FormData {
  const form = new FormData()
  form.append("name", values.name.trim())
  if (values.cropId !== null) form.append("cropId", String(values.cropId))
  for (const key of ["plantedDate", "note"] as const) {
    const value = values[key].trim()
    if (value || forUpdate) form.append(key, value)
  }
  if (values.avatar) {
    form.append("avatar", values.avatar, imageName("avatar", values.avatar))
  }
  return form
}

/** Lời gọi API của feature `my_plants` (docs/my_plants/api_my_plants.md P1 → P7). */
export const plantsApi = {
  /** P1. 10 cây mỗi trang (OQ-45). */
  list: (page: { page: number; pageSize: number }, signal?: AbortSignal) =>
    api.get<Paginated<PlantCard>>("/plants", { query: page, signal }),

  /** P2. */
  create: (values: PlantFormValues) =>
    api.post<{ plant: PlantDetail; suggestions: ReminderSuggestion[] }>(
      "/plants",
      plantFormData(values)
    ),

  /** P3. */
  get: (id: number, signal?: AbortSignal) =>
    api.get<PlantDetail>(`/plants/${id}`, { signal }),

  /** P4. */
  update: (id: number, values: PlantFormValues) =>
    api.patch<PlantDetail>(`/plants/${id}`, plantFormData(values, true)),

  /** P5. */
  remove: (id: number) => api.delete<void>(`/plants/${id}`),

  /** P6 (OQ-47). */
  changeStatus: (id: number, status: ManualStatus) =>
    api.post<PlantDetail>(`/plants/${id}/status`, { status }),

  /** P7. */
  addLog: (
    id: number,
    note: { content: string; actionDate: string; image: Blob | null }
  ) => {
    const form = new FormData()
    form.append("content", note.content.trim())
    if (note.actionDate) form.append("actionDate", note.actionDate)
    if (note.image)
      form.append("image", note.image, imageName("note", note.image))
    return api.post<PlantLogView>(`/plants/${id}/logs`, form)
  },
}
