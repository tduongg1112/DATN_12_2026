import { Button } from "@/components/ui/button"
import { accountsApi } from "@/lib/api/accounts"

/** Logo chính thức của Google: ngoại lệ duy nhất về màu ngoài token (design/05 "Biểu mẫu"). */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.87 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

/**
 * "Tiếp tục với Google" (BR-02): điều hướng toàn trang tới backend (A5), backend chuyển
 * sang Google rồi quay về /login (TD-22). Kiểu `.btn--neutral` có viền mảnh (design/05).
 */
export function GoogleButton({ next }: { next: string | null }) {
  return (
    <Button
      variant="outline"
      className="w-full border-hairline bg-surface"
      nativeButton={false}
      render={<a href={accountsApi.googleLoginUrl(next)} />}
    >
      <GoogleLogo />
      Tiếp tục với Google
    </Button>
  )
}
