import type {
  CreateDiagnosisInput,
  CreateDiagnosisResult,
  DiagnosisResult,
} from "@/lib/types/diagnosis"
import type { PlantFormValues, PlantLink } from "@/lib/types/plants"

import { api } from "./client"
import { plantFormData } from "./plants"

function fileName(name: string, blob: Blob): string {
  return `${name}.${blob.type === "image/png" ? "png" : "jpg"}`
}

/** Lời gọi API của feature `diagnosis` (docs/diagnosis/api_diagnosis.md). */
export const diagnosesApi = {
  /** D1. Multipart: `original`, `processed`, `cropId`. Chờ AI tối đa 15 giây (BR-10). */
  create: (input: CreateDiagnosisInput, signal?: AbortSignal) => {
    const form = new FormData()
    form.append("cropId", String(input.cropId))
    if (input.plantId) form.append("plantId", String(input.plantId))
    form.append(
      "original",
      input.original,
      fileName("original", input.original)
    )
    form.append(
      "processed",
      input.processed,
      fileName("processed", input.processed)
    )
    return api.post<CreateDiagnosisResult>("/diagnoses", form, { signal })
  },

  /** D2. Chỉ lượt của chính mình. */
  get: (id: number, signal?: AbortSignal) =>
    api.get<DiagnosisResult>(`/diagnoses/${id}`, { signal }),

  /** my_plants A1: gắn lượt chưa gắn cây vào cây đã có. */
  attachToPlant: (id: number, plantId: number) =>
    api.post<PlantLink>(`/diagnoses/${id}/plant`, { plantId }),

  /** my_plants A2: tạo cây mới từ lượt rồi gắn. */
  createPlantFrom: (id: number, values: PlantFormValues) =>
    api.post<PlantLink>(`/diagnoses/${id}/new-plant`, plantFormData(values)),
}
