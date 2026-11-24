"use client"

import { useSearchParams } from "next/navigation"
import { BookOpen, Sprout } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { useApiRequest } from "@/hooks/use-api-request"
import { catalogApi } from "@/lib/api/catalog"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { parsePositiveId, ROUTES } from "@/lib/navigation"

import { CropForm } from "./crop-form"
import { DiseaseForm } from "./disease-form"

/** S2 Thêm bệnh `/admin/catalog/diseases/new?classCode=` (chọn sẵn mã lớp khi đi từ S6). */
export function NewDiseaseView() {
  const classCode = useSearchParams().get("classCode")?.slice(0, 100) ?? ""
  return <DiseaseForm mode={{ kind: "create", classCode }} />
}

/** S2 Sửa bệnh `/admin/catalog/diseases/edit?id=`. */
export function EditDiseaseView() {
  const id = parsePositiveId(useSearchParams().get("id"))
  const { data, error, loading, reload } = useApiRequest(
    id === null ? null : `admin-disease:${id}`,
    (signal) => catalogApi.disease(id ?? 0, signal)
  )
  if (id === null || error?.status === 404 || error?.status === 400) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          message={T.NOT_FOUND}
          action={{ label: T.BACK_TO_DISEASES, href: ROUTES.catalog }}
        />
      </Card>
    )
  }
  if (error) return <ErrorState message={error.message} onRetry={reload} />
  if (loading || !data) return <FormSkeleton />
  return <DiseaseForm key={data.id} mode={{ kind: "edit", disease: data }} />
}

/** S5 Sửa loại cây `/admin/catalog/crops/edit?id=`. */
export function EditCropView() {
  const id = parsePositiveId(useSearchParams().get("id"))
  const { data, error, loading, reload } = useApiRequest(
    id === null ? null : `admin-crop:${id}`,
    (signal) => catalogApi.crop(id ?? 0, signal)
  )
  if (id === null || error?.status === 404 || error?.status === 400) {
    return (
      <Card>
        <EmptyState
          icon={Sprout}
          message={T.NOT_FOUND}
          action={{ label: T.BACK_TO_CROPS, href: ROUTES.catalogCrops }}
        />
      </Card>
    )
  }
  if (error) return <ErrorState message={error.message} onRetry={reload} />
  if (loading || !data) return <FormSkeleton />
  return <CropForm key={data.id} crop={data} />
}

/** Khung chờ của form (design/07). */
export function FormSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-2 lg:grid-cols-12 lg:gap-5"
    >
      <span className="sr-only">Đang tải</span>
      <Card className="grid gap-4 lg:col-span-8">
        <Skeleton className="h-6 w-1/3 rounded-full" />
        <Skeleton className="h-[52px] w-full rounded-full" />
        <Skeleton className="h-[52px] w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </Card>
      <Card className="hidden gap-4 lg:col-span-4 lg:grid">
        <Skeleton className="h-6 w-1/2 rounded-full" />
        <Skeleton className="h-[52px] w-full rounded-full" />
      </Card>
    </div>
  )
}
