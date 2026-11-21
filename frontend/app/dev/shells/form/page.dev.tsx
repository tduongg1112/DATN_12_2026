import { FormShell } from "@/components/layout/page-shells"
import { Button } from "@/components/ui/button"

/** Khung Biểu mẫu với ô nhập mẫu (class .field của design/05), chỉ để xem khi dev. */
export default function FormShellPreview() {
  return (
    <FormShell>
      <h1 className="m-0 mb-6 type-h1">Đăng nhập</h1>
      <form className="grid gap-4">
        <div className="field">
          <label className="field__label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="field__input"
            type="email"
            autoComplete="email"
            inputMode="email"
          />
        </div>
        <div className="field field--error">
          <label className="field__label" htmlFor="password">
            Mật khẩu
          </label>
          <input
            id="password"
            className="field__input"
            type="password"
            autoComplete="current-password"
            aria-invalid
            aria-describedby="password-help"
          />
          <p id="password-help" className="field__help m-0">
            Email hoặc mật khẩu không đúng
          </p>
        </div>
        <Button type="button" className="mt-2 w-full">
          Đăng nhập
        </Button>
      </form>
    </FormShell>
  )
}
