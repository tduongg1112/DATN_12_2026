import { FormShell } from "@/components/layout/page-shells"

/** Nhóm trang xác thực, không cần đăng nhập (specs_auth BR-01). */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <FormShell>{children}</FormShell>
}
