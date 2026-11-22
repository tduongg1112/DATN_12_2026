"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SearchX } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { FilterChips, type ChipOption } from "@/components/ds/filter-chips"
import { SearchField } from "@/components/ds/search-field"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { libraryApi } from "@/lib/api/library"
import { LIBRARY_PAGE_SIZE, LIBRARY_TEXT } from "@/lib/library/text"
import { libraryHref, parsePositiveId, ROUTES } from "@/lib/navigation"
import type { DiseaseCard as DiseaseCardData } from "@/lib/types/library"
import { cn } from "@/lib/utils"

import { DiseaseCard } from "./disease-card"

/** Chờ 300 ms sau phím cuối mới tìm (design/screens/disease_library.md S2). */
const SEARCH_DEBOUNCE_MS = 300
/** Cùng giới hạn với API (OQ-37). */
const QUERY_MAX_LENGTH = 100

interface MorePages {
  filterKey: string
  items: DiseaseCardData[]
  page: number
}

/**
 * S2 "Bệnh cây hay gặp" / Xem tất cả (US-02; BR-01, 05, 11). Bộ lọc nằm trên URL
 * (`?crop=&q=`) để quay lại từ trang chi tiết vẫn giữ. Đọc `useSearchParams` nên trang phải
 * bọc `<Suspense>`.
 */
export function LibraryListView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cropId = parsePositiveId(searchParams.get("crop"))
  const query = (searchParams.get("q") ?? "").trim()
  const filterKey = `${cropId ?? "all"}|${query}`

  const [text, setText] = React.useState(() => searchParams.get("q") ?? "")
  const searchTimer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  const applyFilter = React.useCallback(
    (next: { cropId: number | null; q: string }) => {
      window.clearTimeout(searchTimer.current)
      router.replace(libraryHref({ cropId: next.cropId, q: next.q.trim() }), {
        scroll: false,
      })
    },
    [router]
  )

  function handleTextChange(value: string) {
    setText(value)
    window.clearTimeout(searchTimer.current)
    if (value === "") {
      applyFilter({ cropId, q: "" })
      return
    }
    searchTimer.current = window.setTimeout(
      () => applyFilter({ cropId, q: value }),
      SEARCH_DEBOUNCE_MS
    )
  }

  const crops = useApiRequest("crops", (signal) => libraryApi.crops(signal))
  const firstPage = useApiRequest(`diseases|${filterKey}`, (signal) =>
    libraryApi.diseases(
      { cropId, q: query, page: 1, pageSize: LIBRARY_PAGE_SIZE },
      signal
    )
  )

  const [more, setMore] = React.useState<MorePages | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const extra = more?.filterKey === filterKey ? more : null
  const items = firstPage.data
    ? [...firstPage.data.items, ...(extra?.items ?? [])]
    : []
  const total = firstPage.data?.total ?? 0
  const hasMore = !firstPage.loading && items.length < total

  async function handleLoadMore() {
    const page = (extra?.page ?? 1) + 1
    setLoadingMore(true)
    try {
      const next = await libraryApi.diseases({
        cropId,
        q: query,
        page,
        pageSize: LIBRARY_PAGE_SIZE,
      })
      const seen = new Set(items.map((d) => d.id))
      setMore({
        filterKey,
        page,
        items: [
          ...(extra?.items ?? []),
          ...next.items.filter((d) => !seen.has(d.id)),
        ],
      })
    } catch (error) {
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setLoadingMore(false)
    }
  }

  const chipOptions: ChipOption<number | null>[] = [
    { value: null, label: LIBRARY_TEXT.ALL_CROPS },
    ...(crops.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  let content: React.ReactNode
  if (firstPage.error) {
    content = (
      <ErrorState
        message={firstPage.error.message}
        onRetry={firstPage.reload}
      />
    )
  } else if (!firstPage.data) {
    content = <LibraryListSkeleton />
  } else if (total === 0 && !firstPage.loading) {
    content = (
      <Card>
        <EmptyState
          icon={SearchX}
          message={LIBRARY_TEXT.NO_MATCH}
          action={{
            label: LIBRARY_TEXT.DIAGNOSE_BY_IMAGE,
            href: ROUTES.diagnose,
          }}
        />
      </Card>
    )
  } else {
    content = (
      <>
        <ul
          aria-busy={firstPage.loading}
          className={cn(
            "m-0 grid list-none gap-2 p-0 transition-opacity duration-[var(--dur-base)] sm:grid-cols-2 lg:grid-cols-3 lg:gap-5",
            firstPage.loading && "opacity-60"
          )}
        >
          {items.map((disease) => (
            <li key={disease.id} className="min-w-0">
              <Card className="h-full lg:p-5">
                <DiseaseCard disease={disease} variant="tile" />
              </Card>
            </li>
          ))}
        </ul>
        {hasMore && (
          <Button
            variant="secondary"
            className="justify-self-center"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {LIBRARY_TEXT.LOAD_MORE}
          </Button>
        )}
      </>
    )
  }

  return (
    <div className="grid gap-3 lg:gap-5">
      <div className="grid gap-3 lg:flex lg:items-center lg:gap-5">
        <SearchField
          value={text}
          onChange={handleTextChange}
          label={LIBRARY_TEXT.SEARCH_LABEL}
          clearLabel={LIBRARY_TEXT.CLEAR_SEARCH}
          maxLength={QUERY_MAX_LENGTH}
          className="lg:w-[480px] lg:flex-none"
        />
        <FilterChips
          options={chipOptions}
          value={cropId}
          onChange={(next) => applyFilter({ cropId: next, q: text })}
          label={LIBRARY_TEXT.CROP_FILTER_LABEL}
          className="min-w-0"
        />
      </div>
      {content}
    </div>
  )
}

/** Khung chờ đúng hình lưới thẻ (design/07). */
export function LibraryListSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
    >
      <span className="sr-only">Đang tải</span>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="flex gap-4 sm:grid lg:p-5">
          <Skeleton className="size-21 shrink-0 rounded-md sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-xl" />
          <div className="grid flex-1 content-start gap-2">
            <Skeleton className="h-5 w-3/4 rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}
