"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

interface TextFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  id: string
  label: string
  /** Lỗi hiển thị ngay dưới ô (C4 UC01 6b2). Có lỗi thì thay dòng gợi ý. */
  error?: string
  /** Dòng gợi ý dưới ô khi không có lỗi. */
  help?: string
  /** Phần tử đặt ở cuối ô (vd nút hiện mật khẩu). */
  trailing?: React.ReactNode
}

/**
 * Ô nhập (design/05 "Biểu mẫu"): nhãn luôn nằm trên ô, lỗi dưới ô, viên thuốc 52.
 * Có `aria-invalid`, `aria-describedby` cho trình đọc màn hình.
 */
export function TextField({
  id,
  label,
  error,
  help,
  trailing,
  className,
  ...input
}: TextFieldProps) {
  const message = error ?? help
  const helpId = message ? `${id}-help` : undefined
  return (
    <div className={cn("field", error && "field--error", className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={cn("field__input", trailing && "pr-14")}
          aria-invalid={error ? true : undefined}
          aria-describedby={helpId}
          {...input}
        />
        {trailing && (
          <span className="absolute top-1/2 right-1 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </div>
      {message && (
        <p id={helpId} className="field__help m-0">
          {message}
        </p>
      )}
    </div>
  )
}

/** Ô mật khẩu có nút `eye` ở cuối ô (design/05). */
export function PasswordField(
  props: Omit<TextFieldProps, "type" | "trailing">
) {
  const [visible, setVisible] = React.useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          className="icon-btn icon-btn--sm bg-transparent"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon size={20} aria-hidden />
        </button>
      }
    />
  )
}

/** Lỗi chung của form (không gắn với trường nào), vd sai email hoặc mật khẩu (BR-07). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="m-0 rounded-md bg-severe-bg px-4 py-3 text-severe type-body-sm"
    >
      {message}
    </p>
  )
}
