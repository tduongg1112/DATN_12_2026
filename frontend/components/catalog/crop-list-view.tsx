"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff, Pencil } from "lucide-react"

import { AdminTable } from "@/components/ds/admin-table"
import { Card } from "@/components/ds/card-stack"
import { ConfirmDialog } from "@/components/ds/confirm-dialog"
import { CoverImage } from "@/components/ds/cover-image"
import { CropStatusPill } from "@/components/ds/publish-status"
import { ErrorState } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { catalogApi } from "@/lib/api/catalog"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { cropEditHref } from "@/lib/navigation"
import type { AdminCropItem } from "@/lib/types/catalog"

import { TableSkeleton } from "./disease-list-view"

/**
 * S4 Danh mục loại cây (US-06; BR-11, 12; C4 2d, 3d1): bảng tên, ảnh, mã, số bệnh, mã lớp
 * khoẻ mạnh, trạng thái. Ẩn loại cây còn bệnh công khai thì hỏi xác nhận trước.
 */
export function CropListView() {
  const list = useApiRequest("admin-crops", (signal) =>
    catalogApi.crops(signal)
  )
  const [confirm, setConfirm] = React.useState<AdminCropItem | null>(null)
  const [busyId, setBusyId] = React.useState<number | null>(null)

  async function setStatus(crop: AdminCropItem) {
    const next = crop.status === "ACTIVE" ? "HIDDEN" : "ACTIVE"
    setBusyId(crop.id)
    try {
      await catalogApi.setCropStatus(crop.id, next)
      notify(next === "HIDDEN" ? T.CROP_HIDDEN : T.CROP_SHOWN)
      setConfirm(null)
      list.reload()
    } catch (error) {
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setBusyId(null)
    }
  }

  function onToggle(crop: AdminCropItem) {
    // BR-12: chỉ hỏi khi còn bệnh đang công khai.
    if (crop.status === "ACTIVE" && crop.publishedDiseaseCount > 0) {
      setConfirm(crop)
    } else {
      void setStatus(crop)
    }
  }

  return (
    <Card className="grid gap-5">
      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : !list.data ? (
        <TableSkeleton rows={5} />
      ) : (
        <AdminTable caption={T.CROPS}>
          <thead>
            <tr>
              <th scope="col">{T.COL_IMAGE}</th>
              <th scope="col">{T.COL_CROP_NAME}</th>
              <th scope="col">{T.COL_CODE}</th>
              <th scope="col" className="text-right">
                {T.COL_DISEASE_COUNT}
              </th>
              <th scope="col">{T.COL_HEALTHY}</th>
              <th scope="col">{T.COL_STATUS}</th>
              <th scope="col">
                <span className="sr-only">{T.COL_ACTIONS}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((crop) => (
              <tr key={crop.id}>
                <td>
                  <CoverImage
                    src={crop.imageUrl}
                    alt=""
                    iconSize={20}
                    className="size-12 rounded-sm"
                  />
                </td>
                <td className="whitespace-nowrap">
                  <Link
                    href={cropEditHref(crop.id)}
                    className="type-title hover:underline"
                  >
                    {crop.name}
                  </Link>
                </td>
                <td className="type-caption">{crop.code}</td>
                <td className="text-right">{crop.diseaseCount}</td>
                <td>
                  {crop.healthyClassCode ? (
                    <span className="break-all type-caption">
                      {crop.healthyClassCode}
                    </span>
                  ) : (
                    <span className="text-ink-secondary type-caption">
                      {T.UNASSIGNED}
                    </span>
                  )}
                </td>
                <td>
                  <CropStatusPill status={crop.status} />
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm icon-btn--outline"
                      aria-label={
                        crop.status === "ACTIVE"
                          ? T.HIDE_NAMED(crop.name)
                          : T.SHOW_NAMED(crop.name)
                      }
                      disabled={busyId === crop.id}
                      onClick={() => onToggle(crop)}
                    >
                      {crop.status === "ACTIVE" ? (
                        <EyeOff size={18} aria-hidden />
                      ) : (
                        <Eye size={18} aria-hidden />
                      )}
                    </button>
                    <Link
                      href={cropEditHref(crop.id)}
                      className="icon-btn icon-btn--sm icon-btn--outline"
                      aria-label={T.EDIT_NAMED(crop.name)}
                    >
                      <Pencil size={18} aria-hidden />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={T.HIDE_CROP_TITLE(confirm.name)}
          description={T.HIDE_CROP_BODY(confirm.publishedDiseaseCount)}
          confirmLabel={T.HIDE_CROP}
          cancelLabel={T.CANCEL}
          confirmVariant="default"
          busy={busyId === confirm.id}
          onConfirm={() => void setStatus(confirm)}
        />
      )}
    </Card>
  )
}
