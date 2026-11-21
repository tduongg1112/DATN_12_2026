import { RequireAuth } from "@/lib/auth"

/** Khu quản trị: chỉ ADMIN. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireAuth roles={["ADMIN"]}>{children}</RequireAuth>
}
