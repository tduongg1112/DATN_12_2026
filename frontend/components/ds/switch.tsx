"use client"

import { cn } from "@/lib/utils"

interface SwitchFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  help?: string
  disabled?: boolean
  className?: string
}

/** Bật tắt (design/05 `.switch`, oliu khi bật) kèm nhãn và dòng gợi ý. */
export function SwitchField({
  id,
  label,
  checked,
  onChange,
  help,
  disabled,
  className,
}: SwitchFieldProps) {
  const helpId = help ? `${id}-help` : undefined
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="field__label cursor-pointer">
          {label}
        </label>
        <span className="switch">
          <input
            id={id}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            aria-describedby={helpId}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="switch__track" aria-hidden />
        </span>
      </div>
      {help && (
        <p id={helpId} className="m-0 text-ink-secondary type-caption">
          {help}
        </p>
      )}
    </div>
  )
}
