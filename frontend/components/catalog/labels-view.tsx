"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, Tags, TriangleAlert } from "lucide-react"

import { AdminTable } from "@/components/ds/admin-table"
import { Card } from "@/components/ds/card-stack"
import { ConfirmDialog } from "@/components/ds/confirm-dialog"
import { StatusPill } from "@/components/ds/health-status"
import { FilterChips } from "@/components/ds/filter-chips"
import { StatRow } from "@/components/ds/stat-row"
import { ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { catalogApi } from "@/lib/api/catalog"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { cropEditHref, diseaseEditHref, diseaseNewHref } from "@/lib/navigation"
import type { ModelLabelItem, StaleLabelItem } from "@/lib/types/catalog"

type Filter = "all" | "unassigned"

function assignedTo(item: ModelLabelItem | StaleLabelItem): string {
  if (item.disease) return `${item.disease.name} – ${item.crop?.name ?? ""}`
  if (item.crop) return T.HEALTHY_OF(item.crop.name)
  return "—"
}

function editHref(item: ModelLabelItem | StaleLabelItem): string | null {
  if (item.disease) return diseaseEditHref(item.disease.id)
  if (item.crop) return cropEditHref(item.crop.id)
  return null
}

/**
 * S6 Nhãn mô hình (US-07; BR-15, 19; OQ-59): đối chiếu danh sách mã lớp của mô hình đang
 * dùng (M1) với danh mục; mã chưa gán dẫn sang thêm bệnh; nhãn không còn trong mô hình thì
 * "Cập nhật theo mô hình" (M2).
 */
export function LabelsView() {
  const labels = useApiRequest("model-labels", (signal) =>
    catalogApi.modelLabels(signal)
  )
  const [filter, setFilter] = React.useState<Filter>("all")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)

  async function sync() {
    setSyncing(true)
    try {
      const { deactivated } = await catalogApi.syncLabels()
      notify(T.SYNCED(deactivated))
      setConfirmOpen(false)
      labels.reload()
    } catch (error) {
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setSyncing(false)
    }
  }

  if (labels.error) {
    return (
      <ErrorState
        message={
          labels.error.code === "AI_LABELS_UNAVAILABLE"
            ? T.AI_UNAVAILABLE
            : labels.error.message
        }
        onRetry={labels.reload}
      />
    )
  }
  if (!labels.data) {
    return (
      <div role="status" aria-live="polite" className="grid gap-2 lg:gap-5">
        <span className="sr-only">Đang tải</span>
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  const { items, stale } = labels.data
  const unassigned = items.filter((i) => !i.assigned)
  const shown = filter === "all" ? items : unassigned

  return (
    <div className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5">
      <Card notch className="grid gap-4 lg:col-span-4">
        <StatRow icon={Tags} title={T.MODEL_CODES} value={items.length} />
        <StatRow
          icon={TriangleAlert}
          tone={unassigned.length > 0 ? "warm" : "neutral"}
          title={T.UNASSIGNED}
          value={unassigned.length}
        />
        {unassigned.length > 0 && (
          <p className="m-0 rounded-md bg-[var(--status-watch-bg)] px-4 py-3 text-[var(--status-watch-fg)] type-body-sm">
            {T.MUST_ASSIGN}
          </p>
        )}
      </Card>

      <div className="grid min-w-0 gap-2 lg:col-span-8 lg:gap-5">
        <Card className="grid gap-4">
          <FilterChips<Filter>
            label={T.LABEL_FILTER}
            options={[
              { value: "all", label: T.ALL },
              { value: "unassigned", label: T.UNASSIGNED },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <AdminTable caption={T.LABELS}>
            <thead>
              <tr>
                <th scope="col">{T.COL_CLASS}</th>
                <th scope="col">{T.ASSIGNED_TO}</th>
                <th scope="col">{T.COL_STATUS}</th>
                <th scope="col">
                  <span className="sr-only">{T.COL_ACTIONS}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => {
                const href = editHref(item)
                return (
                  <tr key={item.classCode}>
                    <td className="break-all type-caption">{item.classCode}</td>
                    <td className="min-w-40">{assignedTo(item)}</td>
                    <td>
                      <StatusPill tone={item.assigned ? "healthy" : "watch"}>
                        {item.assigned ? T.ASSIGNED : T.UNASSIGNED}
                      </StatusPill>
                    </td>
                    <td>
                      <div className="flex justify-end">
                        {!item.assigned ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            nativeButton={false}
                            render={
                              <Link href={diseaseNewHref(item.classCode)} />
                            }
                          >
                            {T.ADD_WITH_CODE}
                          </Button>
                        ) : href ? (
                          <Link
                            href={href}
                            className="icon-btn icon-btn--sm icon-btn--outline"
                            aria-label={T.EDIT_NAMED(item.classCode)}
                          >
                            <Pencil size={18} aria-hidden />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminTable>
          <p className="m-0 text-ink-secondary type-caption">
            {T.HEALTHY_IN_CROP_FORM}
          </p>
        </Card>

        {stale.length > 0 && (
          <Card className="grid gap-4">
            <h2 className="m-0 type-h3">{T.STALE_TITLE}</h2>
            <ul className="m-0 grid list-none p-0">
              {stale.map((s) => (
                <li
                  key={s.classCode}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-t border-dashed border-line py-3 first:border-0 first:pt-0"
                >
                  <span className="break-all type-caption">{s.classCode}</span>
                  <span className="text-ink-secondary type-body-sm">
                    {assignedTo(s)}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              className="justify-self-start"
              disabled={syncing}
              onClick={() => setConfirmOpen(true)}
            >
              {T.SYNC}
            </Button>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={T.SYNC_TITLE(stale.length)}
        description={T.SYNC_BODY}
        confirmLabel={T.SYNC}
        cancelLabel={T.CANCEL}
        confirmVariant="default"
        busy={syncing}
        onConfirm={() => void sync()}
      />
    </div>
  )
}
