import { RequireAuth } from "@/lib/auth"

/** Khu người dùng: USER và ADMIN (OQ-22). Chưa đăng nhập thì chuyển tới màn đăng nhập. */
export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireAuth roles={["USER"]}>{children}</RequireAuth>
}
