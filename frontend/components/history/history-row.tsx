"use client"

import * as React from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"

import { CoverImage } from "@/components/ds/cover-image"
import { ResultStatus } from "@/components/ds/result-status"
import { SeverityPill } from "@/components/ds/severity-pill"
import {
  DIAGNOSIS_TEXT,
  formatDiagnosisTime,
  formatPercent,
} from "@/lib/diagnosis/text"
import { HISTORY_TEXT as T } from "@/lib/history/text"
import { historyDetailHref } from "@/lib/navigation"
import type { HistoryItem } from "@/lib/types/history"
import { cn } from "@/lib/utils"

/**
 * Tiêu đề một lượt theo dạng kết quả (OQ-43): `UNCERTAIN` không lấy tên bệnh hạng 1 làm
 * tiêu đề, vì chưa phải kết luận (diagnosis BR-17).
 */
export function historyTitle(item: HistoryItem): string {
  if (item.resultType === "DISEASE" && item.disease) return item.disease.name
  if (item.resultType === "HEALTHY") return DIAGNOSIS_TEXT.HEALTHY_TITLE
  return DIAGNOSIS_TEXT.UNCERTAIN_TITLE
}

interface HistoryRowProps {
  item: HistoryItem
  /** Đang ở chế độ chọn nhiều. */
  selecting: boolean
  selected: boolean
  /** Đã chọn đủ 100 mục: khoá ô chọn của mục chưa chọn (TD-27). */
  selectDisabled: boolean
  onToggle: () => void
  onDelete: () => void
}

/** Một lượt tra cứu ở danh sách (Bảng 4.6 cột DS; design/screens/history.md S1). */
export function HistoryRow({
  item,
  selecting,
  selected,
  selectDisabled,
  onToggle,
  onDelete,
}: HistoryRowProps) {
  const checkboxId = React.useId()
  const title = historyTitle(item)
  const meta = [
    item.crop.name,
    item.plant?.name,
    formatDiagnosisTime(item.createdAt),
  ].filter(Boolean)

  const body = (
    <>
      <CoverImage
        src={item.thumbnailUrl}
        alt=""
        iconSize={24}
        className="size-16 shrink-0 rounded-md lg:size-[72px]"
      />
      <span className="grid min-w-0 flex-1 gap-1.5">
        <span className="truncate type-title">{title}</span>
        <span className="flex flex-wrap gap-1.5">
          <ResultStatus resultType={item.resultType} />
          {item.resultType === "DISEASE" && item.disease && (
            <SeverityPill severity={item.disease.severity} />
          )}
        </span>
        <span className="text-ink-secondary type-caption">
          {meta.join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-right type-num-md">
        {formatPercent(item.probability)}
      </span>
    </>
  )
  const bodyClass =
    "flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

  return (
    <li className="flex items-center gap-2 border-t border-dashed border-line py-3 first:border-0 first:pt-0 last:pb-0">
      {selecting && (
        <input
          id={checkboxId}
          type="checkbox"
          checked={selected}
          disabled={!selected && selectDisabled}
          onChange={onToggle}
          className="size-5 shrink-0 cursor-pointer accent-[var(--olive-400)] disabled:cursor-not-allowed"
        />
      )}
      {selecting ? (
        <label htmlFor={checkboxId} className={cn(bodyClass, "cursor-pointer")}>
          {body}
        </label>
      ) : (
        <Link href={historyDetailHref(item.id)} className={bodyClass}>
          {body}
        </Link>
      )}
      {!selecting && (
        <button
          type="button"
          className="icon-btn icon-btn--sm shrink-0"
          aria-label={`${T.DELETE_ONE}: ${title}`}
          onClick={onDelete}
        >
          <Trash2 size={20} aria-hidden />
        </button>
      )}
    </li>
  )
}
