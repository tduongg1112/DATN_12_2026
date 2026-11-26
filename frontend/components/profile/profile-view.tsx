"use client"

import * as React from "react"

import { Avatar } from "@/components/ds/avatar"
import { Card, CardStack } from "@/components/ds/card-stack"
import { FormError, PasswordField, TextField } from "@/components/ds/field"
import { ErrorState, PageSkeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { accountsApi } from "@/lib/api/accounts"
import { useAuth } from "@/lib/auth"
import { AUTH_TEXT } from "@/lib/auth/messages"
import {
  checkConfirm,
  checkFullName,
  checkNewPassword,
  checkPasswordPresent,
  compact,
  type FieldErrors,
} from "@/lib/auth/validation"
import { device, validateImageFile } from "@/lib/device"
import type { UserProfile } from "@/lib/types/account"
import { cn } from "@/lib/utils"

const IMAGE_ERROR_CODES = new Set(["INVALID_IMAGE_TYPE", "IMAGE_TOO_LARGE"])

/** S4 Hồ sơ (design/screens/auth.md; US-05; BR-16, BR-17). */
export function ProfileView() {
  const { profile, profileStatus, reloadProfile } = useAuth()

  if (profileStatus === "error") {
    return (
      <ErrorState
        message={CLIENT_ERRORS.INTERNAL_ERROR}
        onRetry={() => void reloadProfile()}
      />
    )
  }
  if (!profile) return <PageSkeleton label="Đang tải hồ sơ" />

  return (
    <CardStack background="detail" className="lg:grid-cols-12 lg:items-start">
      <ProfileInfoCard
        key={`info-${profile.id}`}
        profile={profile}
        className="lg:col-span-7"
      />
      {/* BR-17, OQ-27: tài khoản chỉ dùng Google thì không có mục đổi mật khẩu. */}
      {profile.hasPassword && (
        <ChangePasswordCard
          key={`pw-${profile.id}`}
          className="lg:col-span-5"
        />
      )}
    </CardStack>
  )
}

function ProfileInfoCard({
  profile,
  className,
}: {
  profile: UserProfile
  className?: string
}) {
  const { setProfile } = useAuth()
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = React.useState(profile.fullName)
  const [avatar, setAvatar] = React.useState<Blob | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<
    FieldErrors<"fullName" | "avatar">
  >({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Thu hồi URL xem trước cũ để không rò bộ nhớ.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function handlePickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const invalid = validateImageFile(file)
    if (invalid) {
      setErrors((e) => ({ ...e, avatar: invalid }))
      return
    }
    // Nén ở trình duyệt trước khi tải lên (design/06, TD-17).
    const compressed = await device.images.compress(file).catch(() => file)
    setErrors((e) => ({ ...e, avatar: undefined }))
    setAvatar(compressed)
    setPreview(URL.createObjectURL(compressed))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = compact({ fullName: checkFullName(fullName) })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const updated = await accountsApi.updateProfile({
        fullName: fullName.trim(),
        avatar,
      })
      setProfile(updated)
      setFullName(updated.fullName)
      setAvatar(null)
      setPreview(null)
      notify(AUTH_TEXT.PROFILE_UPDATED)
    } catch (error) {
      if (isApiError(error) && IMAGE_ERROR_CODES.has(error.code)) {
        setErrors({ avatar: error.message })
      } else if (isApiError(error) && error.errors.length > 0) {
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
    <Card className={cn(className)}>
      <h2 className="m-0 mb-5 type-h3">Thông tin cá nhân</h2>
      <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <div className="flex items-center gap-4">
            <Avatar src={preview ?? profile.avatarUrl} size="lg" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
            >
              Đổi ảnh
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handlePickAvatar}
            />
          </div>
          {errors.avatar && (
            <p role="alert" className="m-0 text-severe type-caption">
              {errors.avatar}
            </p>
          )}
        </div>
        <TextField
          id="fullName"
          label="Họ tên"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <div className="grid gap-1.5">
          <span className="field__label">Email</span>
          <p className="m-0 break-all text-ink-secondary type-body">
            {profile.email}
          </p>
        </div>
        <FormError message={formError} />
        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          Lưu thay đổi
        </Button>
      </form>
    </Card>
  )
}

type PasswordFieldName =
  "currentPassword" | "newPassword" | "confirmNewPassword"

const EMPTY_PASSWORDS: Record<PasswordFieldName, string> = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
}

function ChangePasswordCard({ className }: { className?: string }) {
  const [values, setValues] = React.useState(EMPTY_PASSWORDS)
  const [errors, setErrors] = React.useState<FieldErrors<PasswordFieldName>>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const bind = (field: PasswordFieldName) => ({
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
    error: errors[field],
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = compact<PasswordFieldName>({
      currentPassword: checkPasswordPresent(values.currentPassword),
      newPassword: checkNewPassword(values.newPassword),
      confirmNewPassword: checkConfirm(
        values.newPassword,
        values.confirmNewPassword
      ),
    })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await accountsApi.changePassword(values)
      setValues(EMPTY_PASSWORDS)
      notify(AUTH_TEXT.PASSWORD_CHANGED)
    } catch (error) {
      if (isApiError(error) && error.errors.length > 0) {
        // Gồm "Mật khẩu hiện tại không đúng" dưới ô mật khẩu hiện tại (OQ-33).
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
    <Card className={className}>
      <h2 className="m-0 mb-5 type-h3">Đổi mật khẩu</h2>
      <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
        <PasswordField
          id="currentPassword"
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          {...bind("currentPassword")}
        />
        <PasswordField
          id="newPassword"
          label="Mật khẩu mới"
          autoComplete="new-password"
          help={AUTH_TEXT.PASSWORD_HINT}
          {...bind("newPassword")}
        />
        <PasswordField
          id="confirmNewPassword"
          label="Xác nhận mật khẩu mới"
          autoComplete="new-password"
          {...bind("confirmNewPassword")}
        />
        <FormError message={formError} />
        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          Đổi mật khẩu
        </Button>
      </form>
    </Card>
  )
}
