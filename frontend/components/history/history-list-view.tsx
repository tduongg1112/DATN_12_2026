"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { History, SearchX } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { ConfirmDialog } from "@/components/ds/confirm-dialog"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { UserPageShell } from "@/components/layout/page-shells"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { historyApi } from "@/lib/api/history"
import { libraryApi } from "@/lib/api/library"
import {
  HISTORY_GROUPS,
  historyGroupOf,
  isDateRangeValid,
  parseDateInput,
} from "@/lib/history/dates"
import {
  HISTORY_GROUP_LABEL,
  HISTORY_PAGE_SIZE,
  HISTORY_SELECT_MAX,
  HISTORY_TEXT as T,
  UNDO_TIMEOUT_MS,
} from "@/lib/history/text"
import { historyHref, parsePositiveId, ROUTES } from "@/lib/navigation"
import type { ResultType } from "@/lib/types/diagnosis"
import type { HistoryFilter, HistoryItem } from "@/lib/types/history"
import { cn } from "@/lib/utils"

import { HistoryFilters } from "./history-filters"
import { HistoryRow } from "./history-row"

/** Chờ 300 ms sau phím cuối mới tìm (như thư viện). */
const SEARCH_DEBOUNCE_MS = 300
const RESULT_TYPES: ResultType[] = ["DISEASE", "HEALTHY", "UNCERTAIN"]
const NO_IDS: ReadonlySet<number> = new Set()

/** Bộ lọc đọc từ URL `?q=&crop=&result=&from=&to=` (design/screens/history.md S1). */
function readFilter(params: URLSearchParams): HistoryFilter {
  const result = params.get("result")
  const date = (key: string) => {
    const value = params.get(key)
    return parseDateInput(value) ? value : null
  }
  return {
    q: (params.get("q") ?? "").trim(),
    cropId: parsePositiveId(params.get("crop")),
    resultType: RESULT_TYPES.includes(result as ResultType)
      ? (result as ResultType)
      : null,
    fromDate: date("from"),
    toDate: date("to"),
  }
}

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
}

/**
 * S1 Lịch sử tra cứu (US-01, 02, 06; BR-01 → 03, 08 → 11). Đọc `useSearchParams` nên trang
 * phải bọc `<Suspense>`. Tự dựng khung trang để nút "Chọn" nằm trên thanh đầu trang.
 */
export function HistoryListView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filter = readFilter(searchParams)
  const rangeValid = isDateRangeValid(filter.fromDate, filter.toDate)
  const filterKey = JSON.stringify(filter)
  const hasFilter = Boolean(
    filter.q ||
    filter.cropId ||
    filter.resultType ||
    filter.fromDate ||
    filter.toDate
  )

  // --- Ô tìm (chờ 300 ms) và các bộ lọc khác ghi lên URL -----------------------
  const [text, setText] = React.useState(() => searchParams.get("q") ?? "")
  const [dates, setDates] = React.useState({
    fromDate: filter.fromDate ?? "",
    toDate: filter.toDate ?? "",
  })
  const searchTimer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  const applyFilter = React.useCallback(
    (next: Partial<HistoryFilter>) => {
      window.clearTimeout(searchTimer.current)
      router.replace(historyHref({ ...filter, ...next }), { scroll: false })
    },
    // `filter` dựng lại mỗi lần render; `filterKey` đại diện đúng giá trị của nó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, filterKey]
  )

  function handleTextChange(value: string) {
    setText(value)
    window.clearTimeout(searchTimer.current)
    if (value === "") {
      applyFilter({ q: "" })
      return
    }
    searchTimer.current = window.setTimeout(
      () => applyFilter({ q: value.trim() }),
      SEARCH_DEBOUNCE_MS
    )
  }

  function handleDateChange(next: { fromDate: string; toDate: string }) {
    setDates(next)
    // Ngày gõ dở (chưa hợp lệ) thì chưa đổi bộ lọc.
    const complete = (v: string) => v === "" || parseDateInput(v) !== null
    if (complete(next.fromDate) && complete(next.toDate)) {
      applyFilter({
        fromDate: next.fromDate || null,
        toDate: next.toDate || null,
      })
    }
  }

  function clearFilters() {
    setText("")
    setDates({ fromDate: "", toDate: "" })
    window.clearTimeout(searchTimer.current)
    router.replace(ROUTES.history, { scroll: false })
  }

  // --- Dữ liệu: trang 1 theo bộ lọc, "Xem thêm", mục vừa xoá ----------------------
  /** Tăng sau khi xoá hoặc hoàn tác để tải lại từ trang 1. */
  const [version, setVersion] = React.useState(0)
  const listKey = `${filterKey}#${version}`
  const crops = useApiRequest("crops", (signal) => libraryApi.crops(signal))
  const firstPage = useApiRequest(
    rangeValid ? `history|${listKey}` : null,
    (signal) =>
      historyApi.list(filter, { page: 1, pageSize: HISTORY_PAGE_SIZE }, signal)
  )
  const [more, setMore] = React.useState<{
    key: string
    page: number
    items: HistoryItem[]
  } | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)
  /** Mục vừa xoá: ẩn ngay, không chờ tải lại. */
  const [removed, setRemoved] = React.useState<{
    key: string
    ids: ReadonlySet<number>
  } | null>(null)

  const extra = more?.key === listKey ? more : null
  const removedIds = removed?.key === filterKey ? removed.ids : NO_IDS
  const loaded = firstPage.data
    ? [...firstPage.data.items, ...(extra?.items ?? [])]
    : []
  const items = loaded.filter((item) => !removedIds.has(item.id))
  const serverTotal = firstPage.data?.total ?? 0
  const total = Math.max(
    0,
    serverTotal - loaded.filter((i) => removedIds.has(i.id)).length
  )
  const hasMore = !firstPage.loading && loaded.length < serverTotal

  async function handleLoadMore() {
    const page = (extra?.page ?? 1) + 1
    setLoadingMore(true)
    try {
      const next = await historyApi.list(filter, {
        page,
        pageSize: HISTORY_PAGE_SIZE,
      })
      const seen = new Set(loaded.map((i) => i.id))
      setMore({
        key: listKey,
        page,
        items: [
          ...(extra?.items ?? []),
          ...next.items.filter((i) => !seen.has(i.id)),
        ],
      })
    } catch (error) {
      notify(errorMessage(error))
    } finally {
      setLoadingMore(false)
    }
  }

  // --- Chọn nhiều, xoá, hoàn tác (BR-08, TD-27) ------------------------------------
  const [selecting, setSelecting] = React.useState(false)
  const [selection, setSelection] = React.useState<{
    key: string
    ids: ReadonlySet<number>
  } | null>(null)
  const selectedIds = selection?.key === filterKey ? selection.ids : NO_IDS
  const selectFull = selectedIds.size >= HISTORY_SELECT_MAX
  const [pending, setPending] = React.useState<HistoryItem[] | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  function setSelected(ids: ReadonlySet<number>) {
    setSelection({ key: filterKey, ids })
  }

  function toggle(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else if (next.size < HISTORY_SELECT_MAX) next.add(id)
    setSelected(next)
  }

  function selectAll() {
    setSelected(
      new Set(items.slice(0, HISTORY_SELECT_MAX).map((item) => item.id))
    )
  }

  function stopSelecting() {
    setSelecting(false)
    setSelected(NO_IDS)
  }

  async function restore(ids: number[]) {
    try {
      await historyApi.restore(ids)
      setRemoved((prev) => {
        if (!prev) return prev
        const next = new Set(prev.ids)
        ids.forEach((id) => next.delete(id))
        return { key: prev.key, ids: next }
      })
      setVersion((v) => v + 1)
      notify(T.RESTORED(ids.length))
    } catch (error) {
      notify(errorMessage(error))
    }
  }

  async function confirmDelete() {
    if (!pending) return
    const ids = pending.map((item) => item.id)
    setDeleting(true)
    try {
      await historyApi.remove(ids)
      setRemoved((prev) => ({
        key: filterKey,
        ids: new Set([...(prev?.key === filterKey ? prev.ids : []), ...ids]),
      }))
      setVersion((v) => v + 1)
      setPending(null)
      stopSelecting()
      notify(T.DELETED(ids.length), {
        timeout: UNDO_TIMEOUT_MS,
        action: { label: T.UNDO, onClick: () => void restore(ids) },
      })
    } catch (error) {
      setPending(null)
      notify(errorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  // --- Nội dung ----------------------------------------------------------------------
  const [now] = React.useState(() => new Date())
  let content: React.ReactNode
  if (firstPage.error) {
    content = (
      <ErrorState
        message={firstPage.error.message}
        onRetry={firstPage.reload}
      />
    )
  } else if (!firstPage.data) {
    content = rangeValid ? <HistoryListSkeleton /> : null
  } else if (total === 0 && !firstPage.loading) {
    content = (
      <Card>
        {hasFilter ? (
          <EmptyState
            icon={SearchX}
            message={T.NO_MATCH}
            action={{ label: T.CLEAR_FILTERS, onClick: clearFilters }}
          />
        ) : (
          <EmptyState
            icon={History}
            message={T.EMPTY}
            action={{ label: T.DIAGNOSE_NOW, href: ROUTES.diagnose }}
          />
        )}
      </Card>
    )
  } else {
    const groups = HISTORY_GROUPS.map((group) => ({
      group,
      items: items.filter((i) => historyGroupOf(i.createdAt, now) === group),
    })).filter((g) => g.items.length > 0)
    content = (
      <div
        aria-busy={firstPage.loading}
        className={cn(
          "grid gap-2 transition-opacity duration-[var(--dur-base)] lg:gap-5",
          firstPage.loading && "opacity-60"
        )}
      >
        {groups.map(({ group, items: groupItems }) => (
          <Card key={group}>
            <h2 className="m-0 mb-2 type-h3">{HISTORY_GROUP_LABEL[group]}</h2>
            <ul className="m-0 grid list-none p-0">
              {groupItems.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  selecting={selecting}
                  selected={selectedIds.has(item.id)}
                  selectDisabled={selectFull}
                  onToggle={() => toggle(item.id)}
                  onDelete={() => setPending([item])}
                />
              ))}
            </ul>
          </Card>
        ))}
        {hasMore && (
          <Button
            variant="secondary"
            className="justify-self-center"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {T.LOAD_MORE}
          </Button>
        )}
      </div>
    )
  }

  const canSelect = items.length > 0

  return (
    <UserPageShell
      layout="list"
      title={T.PAGE_TITLE}
      actions={
        canSelect || selecting ? (
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={selecting}
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
          >
            {selecting ? T.DONE : T.SELECT}
          </Button>
        ) : null
      }
    >
      <div
        className={cn(
          "grid gap-3 lg:gap-5",
          selecting && "pb-[calc(var(--ctl-md)+var(--s-8))]"
        )}
      >
        <HistoryFilters
          text={text}
          onTextChange={handleTextChange}
          crops={crops.data}
          cropId={filter.cropId}
          onCropChange={(cropId) => applyFilter({ cropId })}
          resultType={filter.resultType}
          onResultTypeChange={(resultType) => applyFilter({ resultType })}
          fromDate={dates.fromDate}
          toDate={dates.toDate}
          onDateChange={handleDateChange}
          dateError={rangeValid ? null : T.DATE_RANGE_INVALID}
        />
        {content}
      </div>

      {selecting && (
        <div className="fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 lg:sticky lg:inset-x-auto lg:bottom-5 lg:mt-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3 shadow-float lg:rounded-full lg:px-5">
            <p className="m-0 mr-auto type-title" aria-live="polite">
              {T.SELECTED(selectedIds.size)}
            </p>
            <Button variant="secondary" size="sm" onClick={selectAll}>
              {T.SELECT_ALL}
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() =>
                setPending(items.filter((i) => selectedIds.has(i.id)))
              }
            >
              {T.DELETE}
            </Button>
            {selectFull && (
              <p className="m-0 w-full text-ink-secondary type-caption">
                {T.SELECT_LIMIT}
              </p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={T.CONFIRM_TITLE(pending?.length ?? 1)}
        description={
          <>
            <p className="m-0">{T.CONFIRM_BODY}</p>
            {pending?.some((item) => item.plant) && (
              <p className="m-0">{T.CONFIRM_PLANT_NOTE}</p>
            )}
          </>
        }
        confirmLabel={T.DELETE}
        cancelLabel={T.CANCEL}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </UserPageShell>
  )
}

/** Khung chờ: 1 card nhóm với 4 hàng (design/07). */
export function HistoryListSkeleton() {
  return (
    <Card role="status" aria-live="polite" className="grid gap-4">
      <span className="sr-only">Đang tải</span>
      <Skeleton className="h-6 w-28 rounded-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-16 shrink-0 rounded-md lg:size-[72px]" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-5 w-1/2 rounded-full" />
            <Skeleton className="h-4 w-1/3 rounded-full" />
          </div>
        </div>
      ))}
    </Card>
  )
}
