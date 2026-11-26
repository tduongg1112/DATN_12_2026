"use client"

import * as React from "react"
import Link from "next/link"
import { Sprout } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { plantsApi } from "@/lib/api/plants"
import { plantNewHref, ROUTES } from "@/lib/navigation"
import { PLANTS_PAGE_SIZE, PLANTS_TEXT as T } from "@/lib/plants/text"
import type { PlantCard as PlantCardData } from "@/lib/types/plants"

import { PlantCard } from "./plant-card"

/**
 * S1 Cây trồng của tôi (US-01; BR-01, 04, 12; OQ-45): lưới thẻ, 10 cây mỗi lần, "Xem thêm".
 * Thứ tự do API sắp ("Đang có bệnh" → "Đang điều trị" → còn lại).
 */
export function PlantsListView() {
  const firstPage = useApiRequest("plants|1", (signal) =>
    plantsApi.list({ page: 1, pageSize: PLANTS_PAGE_SIZE }, signal)
  )
  const [more, setMore] = React.useState<{
    page: number
    items: PlantCardData[]
  } | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  const items = firstPage.data
    ? [...firstPage.data.items, ...(more?.items ?? [])]
    : []
  const total = firstPage.data?.total ?? 0
  const hasMore = items.length < total

  async function loadMore() {
    const page = (more?.page ?? 1) + 1
    setLoadingMore(true)
    try {
      const next = await plantsApi.list({ page, pageSize: PLANTS_PAGE_SIZE })
      const seen = new Set(items.map((p) => p.id))
      setMore({
        page,
        items: [
          ...(more?.items ?? []),
          ...next.items.filter((p) => !seen.has(p.id)),
        ],
      })
    } catch (error) {
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setLoadingMore(false)
    }
  }

  if (firstPage.error) {
    return (
      <ErrorState
        message={firstPage.error.message}
        onRetry={firstPage.reload}
      />
    )
  }
  if (!firstPage.data) return <PlantsListSkeleton />
  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={Sprout}
          message={T.EMPTY}
          action={{ label: T.ADD, href: plantNewHref() }}
          secondaryAction={{ label: T.DIAGNOSE_NOW, href: ROUTES.diagnose }}
        />
      </Card>
    )
  }

  return (
    // Mobile: chừa chỗ cho nút "Thêm cây" dính đáy trên dock.
    <div className="grid gap-3 pb-[calc(var(--ctl-md)+var(--s-3))] lg:gap-5 lg:pb-0">
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {items.map((plant) => (
          <li key={plant.id} className="min-w-0">
            <PlantCard plant={plant} />
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button
          variant="secondary"
          className="justify-self-center"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {T.LOAD_MORE}
        </Button>
      )}
      <div className="fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 lg:hidden">
        <Button
          className="w-full"
          nativeButton={false}
          render={<Link href={plantNewHref()} />}
        >
          {T.ADD}
        </Button>
      </div>
    </div>
  )
}

/** Nút "Thêm cây" trên thanh đầu trang (desktop; mobile dùng nút dính đáy). */
export function AddPlantAction() {
  return (
    <Button
      size="sm"
      className="hidden lg:inline-flex"
      nativeButton={false}
      render={<Link href={plantNewHref()} />}
    >
      {T.ADD}
    </Button>
  )
}

/** Khung chờ: 3 thẻ (design/07). */
export function PlantsListSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
    >
      <span className="sr-only">Đang tải</span>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex items-center gap-4 lg:p-5">
          <Skeleton className="h-[104px] w-[84px] shrink-0 rounded-md" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-2/3 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}
