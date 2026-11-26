import type {
  AdminCrop,
  AdminCropItem,
  AdminDisease,
  AdminDiseaseItem,
  AdminDiseaseQuery,
  CropFormValues,
  CropStatus,
  DiseaseFormValues,
  ModelLabels,
} from "@/lib/types/catalog"
import type { PathogenGroup } from "@/lib/types/domain"
import type { DiseaseCard } from "@/lib/types/library"

import { api } from "./client"
import type { Paginated } from "./types"

function fileName(name: string, blob: Blob): string {
  return `${name}.${blob.type === "image/png" ? "png" : "jpg"}`
}

/**
 * Form bệnh (B3, B4; TD-32): gửi đủ các trường, ô trống là chuỗi rỗng (backend hiểu là không
 * có giá trị). Ảnh mới ở `images`, thứ tự cuối cùng ở `imageLayout`. `withStatus`: chỉ gửi
 * trạng thái khi thêm hoặc khi bệnh còn "Nháp" (OQ-54).
 */
export function diseaseFormData(
  values: DiseaseFormValues,
  withStatus: boolean
): FormData {
  const form = new FormData()
  if (values.cropId !== null) form.append("cropId", String(values.cropId))
  form.append("name", values.name.trim())
  if (values.pathogenGroup) form.append("pathogenGroup", values.pathogenGroup)
  if (values.severity) form.append("severity", values.severity)
  for (const key of [
    "pathogen",
    "classCode",
    "summary",
    "symptoms",
    "causes",
    "prevention",
    "treatment",
    "recheckDays",
  ] as const) {
    form.append(key, values[key].trim())
  }
  form.append("isFeatured", String(values.isFeatured))
  if (withStatus) form.append("status", values.status)

  let upload = 0
  const layout = values.images.map((image) => {
    const caption = image.caption.trim() || null
    if (image.kind === "existing") return { id: image.id, caption }
    form.append("images", image.blob, fileName(`anh-${upload}`, image.blob))
    return { upload: upload++, caption }
  })
  form.append("imageLayout", JSON.stringify(layout))
  return form
}

/** Form loại cây (C3, C4). */
export function cropFormData(values: CropFormValues): FormData {
  const form = new FormData()
  for (const key of [
    "code",
    "name",
    "description",
    "careGuide",
    "wateringIntervalDays",
    "fertilizingIntervalDays",
    "healthyClassCode",
  ] as const) {
    form.append(key, values[key].trim())
  }
  if (values.image)
    form.append("image", values.image, fileName("crop", values.image))
  else if (values.removeImage) form.append("removeImage", "true")
  return form
}

/** Lời gọi API của feature `catalog` (docs/catalog/api_catalog.md). Chỉ ADMIN. */
export const catalogApi = {
  /** C1. */
  crops: (signal?: AbortSignal) =>
    api.get<AdminCropItem[]>("/admin/crops", { signal }),

  /** C2. */
  crop: (id: number, signal?: AbortSignal) =>
    api.get<AdminCrop>(`/admin/crops/${id}`, { signal }),

  /** C3. */
  createCrop: (values: CropFormValues) =>
    api.post<AdminCrop>("/admin/crops", cropFormData(values)),

  /** C4. */
  updateCrop: (id: number, values: CropFormValues) =>
    api.put<AdminCrop>(`/admin/crops/${id}`, cropFormData(values)),

  /** C5 (BR-12). */
  setCropStatus: (id: number, status: CropStatus) =>
    api.post<{ crop: AdminCrop; hiddenDiseases: number }>(
      `/admin/crops/${id}/status`,
      { status }
    ),

  /** B1. */
  diseases: (query: AdminDiseaseQuery, signal?: AbortSignal) =>
    api.get<Paginated<AdminDiseaseItem>>("/admin/diseases", {
      query: {
        q: query.q?.trim() || undefined,
        cropId: query.cropId ?? undefined,
        status: query.status ?? undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    }),

  /** B2. */
  disease: (id: number, signal?: AbortSignal) =>
    api.get<AdminDisease>(`/admin/diseases/${id}`, { signal }),

  /** B3. */
  createDisease: (values: DiseaseFormValues) =>
    api.post<AdminDisease>("/admin/diseases", diseaseFormData(values, true)),

  /** B4. */
  updateDisease: (id: number, values: DiseaseFormValues, withStatus: boolean) =>
    api.put<AdminDisease>(
      `/admin/diseases/${id}`,
      diseaseFormData(values, withStatus)
    ),

  /** B5 (C4 3c). */
  setDiseaseStatus: (id: number, status: "PUBLISHED" | "HIDDEN") =>
    api.post<AdminDisease>(`/admin/diseases/${id}/status`, { status }),

  /** B6. */
  removeDisease: (id: number) => api.delete<void>(`/admin/diseases/${id}`),

  /** B7: bệnh liên quan cho trang xem trước (OQ-58). */
  related: (
    query: { cropId: number; pathogenGroup: PathogenGroup; excludeId?: number },
    signal?: AbortSignal
  ) => api.get<DiseaseCard[]>("/admin/diseases/related", { query, signal }),

  /** M1. */
  modelLabels: (signal?: AbortSignal) =>
    api.get<ModelLabels>("/admin/labels/model", { signal }),

  /** M2 (BR-19). */
  syncLabels: () => api.post<{ deactivated: number }>("/admin/labels/sync"),
}
