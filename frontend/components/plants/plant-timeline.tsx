import Link from "next/link"
import { Activity, NotebookPen } from "lucide-react"

import { CoverImage } from "@/components/ds/cover-image"
import { ResultStatus } from "@/components/ds/result-status"
import { formatPercent } from "@/lib/diagnosis/text"
import { historyDetailHref } from "@/lib/navigation"
import {
  formatDate,
  MANUAL_STATUS_LABEL,
  PLANTS_TEXT as T,
  todayInput,
} from "@/lib/plants/text"
import type { PlantDetail } from "@/lib/types/plants"

import { historyTitle } from "../history/history-row"

type Entry =
  | {
      kind: "diagnosis"
      day: string
      at: string
      item: PlantDetail["diagnoses"][number]
    }
  | { kind: "log"; day: string; at: string; item: PlantDetail["logs"][number] }

/**
 * Dòng thời gian của cây (BR-05; design/screens/my_plants.md S3): gộp lượt chẩn đoán và
 * nhật ký, nhóm theo ngày, mới nhất trên. Ngày của ghi chú là "ngày thực hiện"; của lượt
 * chẩn đoán, cập nhật tình trạng là ngày tạo theo giờ máy.
 */
export function PlantTimeline({ plant }: { plant: PlantDetail }) {
  const entries: Entry[] = [
    ...plant.diagnoses.map((item) => ({
      kind: "diagnosis" as const,
      day: todayInput(new Date(item.createdAt)),
      at: item.createdAt,
      item,
    })),
    ...plant.logs.map((item) => ({
      kind: "log" as const,
      day:
        item.logType === "CARE_NOTE"
          ? item.actionDate
          : todayInput(new Date(item.createdAt)),
      at: item.createdAt,
      item,
    })),
  ].sort((a, b) =>
    a.day === b.day ? b.at.localeCompare(a.at) : b.day.localeCompare(a.day)
  )

  if (entries.length === 0) {
    return (
      <p className="m-0 text-ink-secondary type-body">{T.TIMELINE_EMPTY}</p>
    )
  }

  const days = [...new Set(entries.map((e) => e.day))]
  return (
    <div className="grid gap-5">
      {days.map((day) => (
        <section key={day} className="grid gap-2">
          <h4 className="m-0 text-ink-secondary type-label">
            {formatDate(day)}
          </h4>
          <ul className="m-0 grid list-none gap-0 p-0">
            {entries
              .filter((e) => e.day === day)
              .map((entry) => (
                <li
                  key={`${entry.kind}-${entry.item.id}`}
                  className="border-t border-dashed border-line py-3 first:border-0 first:pt-0"
                >
                  {entry.kind === "diagnosis" ? (
                    <DiagnosisEntry item={entry.item} />
                  ) : (
                    <LogEntry item={entry.item} />
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function DiagnosisEntry({ item }: { item: PlantDetail["diagnoses"][number] }) {
  return (
    <Link
      href={historyDetailHref(item.id)}
      className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CoverImage
        src={item.thumbnailUrl}
        alt=""
        iconSize={20}
        className="size-14 shrink-0 rounded-md"
      />
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="truncate type-title">{historyTitle(item)}</span>
        <ResultStatus
          resultType={item.resultType}
          className="justify-self-start"
        />
      </span>
      <span className="shrink-0 type-num-sm">
        {formatPercent(item.probability)}
      </span>
    </Link>
  )
}

function LogEntry({ item }: { item: PlantDetail["logs"][number] }) {
  if (item.logType === "STATUS_CHANGE" && item.statusAfter) {
    return (
      <p className="m-0 flex items-center gap-3 type-body">
        <span className="icon-tile icon-tile--neutral size-10" aria-hidden>
          <Activity size={18} />
        </span>
        {T.STATUS_CHANGED(MANUAL_STATUS_LABEL[item.statusAfter])}
      </p>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <span
        className="icon-tile icon-tile--neutral size-10 shrink-0"
        aria-hidden
      >
        <NotebookPen size={18} />
      </span>
      <div className="grid min-w-0 flex-1 gap-2">
        <p className="m-0 text-ink-secondary type-caption">{T.CARE_NOTE}</p>
        <p className="m-0 whitespace-pre-line type-body">{item.content}</p>
        {item.imageUrl && (
          <a
            href={item.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="justify-self-start"
          >
            <CoverImage
              src={item.imageUrl}
              alt={T.CARE_NOTE}
              iconSize={20}
              className="size-24 rounded-md"
            />
          </a>
        )}
      </div>
    </div>
  )
}
