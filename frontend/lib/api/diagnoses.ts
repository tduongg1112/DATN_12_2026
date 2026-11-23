import type {
  CreateDiagnosisInput,
  DiagnosisResult,
} from "@/lib/types/diagnosis"

import { api } from "./client"

function fileName(name: string, blob: Blob): string {
  return `${name}.${blob.type === "image/png" ? "png" : "jpg"}`
}

/** Lời gọi API của feature `diagnosis` (docs/diagnosis/api_diagnosis.md). */
export const diagnosesApi = {
  /** D1. Multipart: `original`, `processed`, `cropId`. Chờ AI tối đa 15 giây (BR-10). */
  create: (input: CreateDiagnosisInput, signal?: AbortSignal) => {
    const form = new FormData()
    form.append("cropId", String(input.cropId))
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
    return api.post<DiagnosisResult>("/diagnoses", form, { signal })
  },

  /** D2. Chỉ lượt của chính mình. */
  get: (id: number, signal?: AbortSignal) =>
    api.get<DiagnosisResult>(`/diagnoses/${id}`, { signal }),
}
