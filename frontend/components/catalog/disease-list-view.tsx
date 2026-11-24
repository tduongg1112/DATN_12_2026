"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, Eye, EyeOff, Pencil, Star } from "lucide-react"

import { AdminTable } from "@/components/ds/admin-table"
import { Card } from "@/components/ds/card-stack"
import { FilterChips } from "@/components/ds/filter-chips"
import { Pagination } from "@/components/ds/pagination"
import { PublishStatusPill } from "@/components/ds/publish-status"
import { SearchField } from "@/components/ds/search-field"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { catalogApi } from "@/lib/api/catalog"
import {
  CATALOG_PAGE_SIZE,
  CATALOG_TEXT as T,
  PUBLISH_STATUS_DISPLAY,
  formatDate,
} from "@/lib/catalog/text"
import { diseaseEditHref, diseaseNewHref } from "@/lib/navigation"
import type { AdminDiseaseItem, PublishStatus } from "@/lib/types/catalog"

const SEARCH_DEBOUNCE_MS = 300
const STATUSES: PublishStatus[] = ["DRAFT", "PUBLISHED", "HIDDEN"]

/**
 * S1 Danh mục bệnh (US-01, US-05; BR-01, 08): tìm theo tên, lọc loại cây và trạng thái,
 * bảng quản trị phân trang 20 bệnh (OQ-60), nút "Ẩn" / "Hiện" theo từng hàng (C4 3c).
 */
export function DiseaseListView() {
  const [text, setText] = React.useState("")
  const [q, setQ] = React.useState("")
  const [cropId, setCropId] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<PublishStatus | null>(null)
  const [page, setPage] = React.useState(1)
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const timer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const crops = useApiRequest("admin-crops", (signal) =>
    catalogApi.crops(signal)
  )
  const filterKey = `${q}|${cropId ?? "all"}|${status ?? "all"}|${page}`
  const list = useApiRequest(`admin-diseases|${filterKey}`, (signal) =>
    catalogApi.diseases(
      { q, cropId, status, page, pageSize: CATALOG_PAGE_SIZE },
      signal
    )
  )

  function handleText(value: string) {
    setText(value)
    window.clearTimeout(timer.current)
    const apply = () => {
      setQ(value.trim())
      setPage(1)
    }
    if (value === "") apply()
    else timer.current = window.setTimeout(apply, SEARCH_DEBOUNCE_MS)
  }

  async function toggle(item: AdminDiseaseItem) {
    const next = item.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"
    setBusyId(item.id)
    try {
      await catalogApi.setDiseaseStatus(item.id, next)
      notify(next === "HIDDEN" ? T.DISEASE_HIDDEN : T.DISEASE_SHOWN)
      list.reload()
    } catch (error) {
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setBusyId(null)
    }
  }

  const filtered = q !== "" || cropId !== null || status !== null
  const data = list.data

  return (
    <Card className="grid gap-5">
      <div className="grid gap-3">
        <SearchField
          value={text}
          onChange={handleText}
          label={T.SEARCH}
          clearLabel={T.CLEAR_SEARCH}
          maxLength={100}
          className="lg:max-w-md"
        />
        {crops.data ? (
          <FilterChips<number | null>
            label={T.CROP_FILTER}
            options={[
              { value: null, label: T.ALL },
              ...crops.data.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={cropId}
            onChange={(id) => {
              setCropId(id)
              setPage(1)
            }}
          />
        ) : (
          <Skeleton className="h-[46px] w-full rounded-full" />
        )}
        <FilterChips<PublishStatus | null>
          label={T.STATUS_FILTER}
          options={[
            { value: null, label: T.ALL },
            ...STATUSES.map((s) => ({
              value: s,
              label: PUBLISH_STATUS_DISPLAY[s].label,
            })),
          ]}
          value={status}
          onChange={(s) => {
            setStatus(s)
            setPage(1)
          }}
        />
      </div>

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : !data ? (
        <TableSkeleton />
      ) : data.total === 0 && !filtered ? (
        <EmptyState
          icon={BookOpen}
          message={T.NO_DISEASES}
          action={{ label: T.ADD_DISEASE, href: diseaseNewHref() }}
        />
      ) : data.total === 0 ? (
        <p className="m-0 py-6 text-center text-ink-secondary type-body">
          {T.NO_MATCH}
        </p>
      ) : (
        <>
          <AdminTable caption={T.DISEASES}>
            <thead>
              <tr>
                <th scope="col">{T.COL_NAME}</th>
                <th scope="col">{T.COL_CROP}</th>
                <th scope="col">{T.COL_CLASS}</th>
                <th scope="col">{T.COL_STATUS}</th>
                <th scope="col">{T.COL_FEATURED}</th>
                <th scope="col">{T.COL_UPDATED}</th>
                <th scope="col">
                  <span className="sr-only">{T.COL_ACTIONS}</span>
                </th>
              </tr>
            </thead>
            <tbody aria-busy={list.loading}>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="min-w-48">
                    <Link
                      href={diseaseEditHref(item.id)}
                      className="type-title hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{item.crop.name}</td>
                  <td>
                    {item.classCode ? (
                      <span className="break-all type-caption">
                        {item.classCode}
                      </span>
                    ) : (
                      <span className="text-ink-secondary type-caption">
                        {T.UNASSIGNED}
                      </span>
                    )}
                  </td>
                  <td>
                    <PublishStatusPill status={item.status} />
                  </td>
                  <td className="whitespace-nowrap">
                    {item.isFeatured ? (
                      <span className="inline-flex items-center gap-1">
                        <Star size={16} aria-hidden />
                        {T.FEATURED}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {item.status !== "DRAFT" && (
                        <button
                          type="button"
                          className="icon-btn icon-btn--sm icon-btn--outline"
                          aria-label={
                            item.status === "PUBLISHED"
                              ? T.HIDE_NAMED(item.name)
                              : T.SHOW_NAMED(item.name)
                          }
                          disabled={busyId === item.id}
                          onClick={() => void toggle(item)}
                        >
                          {item.status === "PUBLISHED" ? (
                            <EyeOff size={18} aria-hidden />
                          ) : (
                            <Eye size={18} aria-hidden />
                          )}
                        </button>
                      )}
                      <Link
                        href={diseaseEditHref(item.id)}
                        className="icon-btn icon-btn--sm icon-btn--outline"
                        aria-label={T.EDIT_NAMED(item.name)}
                      >
                        <Pencil size={18} aria-hidden />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={setPage}
            labels={{ nav: T.PAGINATION, prev: T.PREV_PAGE, next: T.NEXT_PAGE }}
          />
        </>
      )}
    </Card>
  )
}

/** Khung chờ của bảng (design/07). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-2">
      <span className="sr-only">Đang tải</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-sm" />
      ))}
    </div>
  )
}
