"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { FormError, PasswordField, TextField } from "@/components/ds/field"
import { PageSkeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { accountsApi } from "@/lib/api/accounts"
import { useAuth } from "@/lib/auth"
import { AUTH_TEXT } from "@/lib/auth/messages"
import {
  checkConfirm,
  checkEmail,
  checkFullName,
  checkNewPassword,
  compact,
  type FieldErrors,
} from "@/lib/auth/validation"
import { ROUTES } from "@/lib/navigation"

import { useAuthRedirect, withNext } from "./use-auth-redirect"

type RegisterField = "fullName" | "email" | "password" | "confirmPassword"

/** S2 Tạo tài khoản (design/screens/auth.md; US-01; BR-05, 06, 10, 11). */
export function RegisterView() {
  const { ready, next } = useAuthRedirect()
  if (!ready) return <PageSkeleton label="Đang kiểm tra phiên đăng nhập" />

  return (
    <>
      {/* design/06: luôn có nút quay lại trong giao diện. */}
      <Link
        href={withNext(ROUTES.login, next)}
        className="icon-btn icon-btn--tone mb-4"
        aria-label="Quay lại"
      >
        <ArrowLeft size={24} aria-hidden />
      </Link>
      <h1 className="m-0 mb-6 type-h1">Tạo tài khoản</h1>
      <div className="grid gap-5">
        <RegisterForm />
        <p className="m-0 text-center text-ink-secondary type-body-sm">
          Đã có tài khoản?{" "}
          <Link
            href={withNext(ROUTES.login, next)}
            className="font-medium text-ink underline underline-offset-4"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </>
  )
}

function RegisterForm() {
  const { signIn } = useAuth()
  const [values, setValues] = React.useState<Record<RegisterField, string>>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = React.useState<FieldErrors<RegisterField>>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const bind = (field: RegisterField) => ({
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
    error: errors[field],
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // BR-11: báo lỗi dưới từng trường, giữ nguyên dữ liệu đã nhập.
    const found = compact<RegisterField>({
      fullName: checkFullName(values.fullName),
      email: checkEmail(values.email),
      password: checkNewPassword(values.password),
      confirmPassword: checkConfirm(values.password, values.confirmPassword),
    })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const { accessToken } = await accountsApi.register({
        ...values,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
      })
      notify(AUTH_TEXT.REGISTER_SUCCESS)
      // Tự đăng nhập (BR-06); useAuthRedirect chuyển trang.
      signIn(accessToken)
    } catch (error) {
      if (isApiError(error) && error.errors.length > 0) {
        // Gồm cả "Email này đã có tài khoản…" dưới ô Email (BR-10).
        setErrors(fieldErrors(error))
      } else {
        setFormError(
          isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <TextField
        id="fullName"
        label="Họ tên"
        type="text"
        autoComplete="name"
        {...bind("fullName")}
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        {...bind("email")}
      />
      <PasswordField
        id="password"
        label="Mật khẩu"
        autoComplete="new-password"
        help={AUTH_TEXT.PASSWORD_HINT}
        {...bind("password")}
      />
      <PasswordField
        id="confirmPassword"
        label="Xác nhận mật khẩu"
        autoComplete="new-password"
        {...bind("confirmPassword")}
      />
      <FormError message={formError} />
      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        Đăng ký
      </Button>
    </form>
  )
}
