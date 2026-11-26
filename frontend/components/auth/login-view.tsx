"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { FormError, PasswordField, TextField } from "@/components/ds/field"
import { PageSkeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { accountsApi } from "@/lib/api/accounts"
import { useAuth } from "@/lib/auth"
import { AUTH_TEXT } from "@/lib/auth/messages"
import {
  checkEmail,
  checkPasswordPresent,
  compact,
  type FieldErrors,
} from "@/lib/auth/validation"
import { ROUTES } from "@/lib/navigation"

import { GoogleButton } from "./google-button"
import { useAuthRedirect, withNext } from "./use-auth-redirect"

type LoginField = "email" | "password"

/** S1 Đăng nhập (design/screens/auth.md; US-02, US-03; BR-01, 02, 03, 07, 08, 09). */
export function LoginView() {
  const { ready, next } = useAuthRedirect()
  const searchParams = useSearchParams()
  const googleFailed = searchParams.get("error") === "google"

  if (!ready) return <PageSkeleton label="Đang kiểm tra phiên đăng nhập" />

  return (
    <>
      <h1 className="m-0 mb-6 type-h1">Đăng nhập</h1>
      <div className="grid gap-5">
        <GoogleButton next={next} />
        <div className="flex items-center gap-3 text-ink-secondary type-caption">
          <span
            aria-hidden
            className="flex-1 border-t border-dashed border-line"
          />
          hoặc
          <span
            aria-hidden
            className="flex-1 border-t border-dashed border-line"
          />
        </div>
        <LoginForm
          initialError={googleFailed ? AUTH_TEXT.GOOGLE_FAILED : null}
        />
        <p className="m-0 text-center text-ink-secondary type-body-sm">
          Chưa có tài khoản?{" "}
          <Link
            href={withNext(ROUTES.register, next)}
            className="font-medium text-ink underline underline-offset-4"
          >
            Tạo tài khoản
          </Link>
        </p>
      </div>
    </>
  )
}

function LoginForm({ initialError }: { initialError: string | null }) {
  const { signIn } = useAuth()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errors, setErrors] = React.useState<FieldErrors<LoginField>>({})
  const [formError, setFormError] = React.useState<string | null>(initialError)
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = compact<LoginField>({
      email: checkEmail(email),
      password: checkPasswordPresent(password),
    })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const { accessToken } = await accountsApi.login({
        email: email.trim(),
        password,
      })
      // useAuthRedirect chuyển trang theo vai trò khi phiên được tạo (BR-03).
      signIn(accessToken)
    } catch (error) {
      if (isApiError(error) && error.errors.length > 0) {
        setErrors(fieldErrors(error))
      } else {
        // BR-07: sai email hoặc mật khẩu không chỉ ra trường nào; BR-08: bị tạm khoá.
        setFormError(
          isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
        )
        if (isApiError(error) && error.code === "AUTH_INVALID_CREDENTIALS") {
          setPassword("")
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <TextField
        id="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <PasswordField
        id="password"
        label="Mật khẩu"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <FormError message={formError} />
      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        Đăng nhập
      </Button>
    </form>
  )
}
