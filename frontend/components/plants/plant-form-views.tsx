"use client"

import { useSearchParams } from "next/navigation"
import { Sprout } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ds/states"
import { useApiRequest } from "@/hooks/use-api-request"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { plantsApi } from "@/lib/api/plants"
import { DIAGNOSIS_TEXT } from "@/lib/diagnosis/text"
import { parsePositiveId, ROUTES } from "@/lib/navigation"
import { PLANTS_TEXT as T } from "@/lib/plants/text"

import { PlantForm } from "./plant-form"

function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={Sprout}
        message={DIAGNOSIS_TEXT.NOT_FOUND}
        action={{ label: T.BACK_TO_PLANTS, href: ROUTES.plants }}
      />
    </Card>
  )
}

/**
 * S2 Thêm cây `/plants/new`. Có `?diagnosisId=` thì tạo cây từ kết quả chẩn đoán (A2), loại
 * cây điền sẵn theo lượt (C4 UC02 bước 14). Đọc `useSearchParams` nên bọc `<Suspense>`.
 */
export function NewPlantView() {
  const searchParams = useSearchParams()
  const raw = searchParams.get("diagnosisId")
  const diagnosisId = parsePositiveId(raw)
  const diagnosis = useApiRequest(
    diagnosisId === null ? null : `diagnosis:${diagnosisId}`,
    (signal) => diagnosesApi.get(diagnosisId ?? 0, signal)
  )

  if (raw === null) return <PlantForm mode={{ kind: "create" }} />
  if (diagnosisId === null || diagnosis.error?.status === 404) {
    return <NotFound />
  }
  if (diagnosis.error) {
    return (
      <ErrorState
        message={diagnosis.error.message}
        onRetry={diagnosis.reload}
      />
    )
  }
  if (diagnosis.data?.id !== diagnosisId) return <PageSkeleton />
  return (
    <PlantForm
      mode={{
        kind: "fromDiagnosis",
        diagnosisId,
        cropId: diagnosis.data.crop.id,
      }}
    />
  )
}

/** S4 Sửa cây `/plants/edit?id=`. */
export function EditPlantView() {
  const searchParams = useSearchParams()
  const id = parsePositiveId(searchParams.get("id"))
  const plant = useApiRequest(id === null ? null : `plant:${id}`, (signal) =>
    plantsApi.get(id ?? 0, signal)
  )

  if (
    id === null ||
    plant.error?.status === 404 ||
    plant.error?.status === 400
  ) {
    return <NotFound />
  }
  if (plant.error) {
    return <ErrorState message={plant.error.message} onRetry={plant.reload} />
  }
  if (plant.data?.id !== id) return <PageSkeleton />
  return <PlantForm key={id} mode={{ kind: "edit", plant: plant.data }} />
}
