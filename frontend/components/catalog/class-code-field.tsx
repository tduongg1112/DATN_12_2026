"use client"

import { SelectField, type SelectOption } from "@/components/ds/select-field"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { catalogApi } from "@/lib/api/catalog"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import type { ModelLabelItem } from "@/lib/types/catalog"

interface ClassCodeFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  /** Mã đang gán cho chính bệnh / loại cây đang sửa (đã lưu), không hiện chú thích "đã gán". */
  current: string | null
  error?: string
  disabled?: boolean
}

function optionLabel(item: ModelLabelItem, current: string | null): string {
  if (!item.assigned || item.classCode === current) return item.classCode
  if (item.disease) {
    return item.classCode + T.ASSIGNED_TO_DISEASE(item.disease.name)
  }
  return item.classCode + T.ASSIGNED_HEALTHY(item.crop?.name ?? "")
}

/**
 * "Mã lớp mô hình" / "Mã lớp khoẻ mạnh" (C4 bước 4; OQ-17): chọn từ danh sách nhãn của mô
 * hình đang dùng (M1). Mã đã gán chỗ khác vẫn chọn được; khi lưu backend trả câu C4 6.2.
 * M1 lỗi: chỉ còn mã đang gán, kèm câu lỗi và nút thử lại; phần còn lại của form vẫn lưu được.
 */
export function ClassCodeField({
  id,
  label,
  value,
  onChange,
  current,
  error,
  disabled,
}: ClassCodeFieldProps) {
  const labels = useApiRequest("model-labels", (signal) =>
    catalogApi.modelLabels(signal)
  )
  const items = labels.data?.items ?? []
  const options: SelectOption[] = [
    { value: "", label: T.UNASSIGNED },
    ...items.map((item) => ({
      value: item.classCode,
      label: optionLabel(item, current),
    })),
  ]
  // Mã đang chọn không có trong danh sách (AI lỗi, hoặc mã không còn trong mô hình).
  if (value && !items.some((i) => i.classCode === value)) {
    options.splice(1, 0, { value, label: value })
  }

  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled || labels.loading}
      error={error ?? (labels.error ? T.AI_UNAVAILABLE : undefined)}
      help={T.CLASS_CODE_HINT}
      footer={
        labels.error ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={labels.reload}
          >
            {T.RETRY}
          </Button>
        ) : null
      }
    />
  )
}
