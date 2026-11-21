import type { Metadata } from "next"

import { UserPageShell } from "@/components/layout/page-shells"
import { ProfileView } from "@/components/profile/profile-view"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: "Hồ sơ" }

/** S4 Hồ sơ, khuôn "Chi tiết" (design/screens/auth.md). USER và ADMIN (OQ-22). */
export default function Page() {
  return (
    <UserPageShell layout="detail" title="Hồ sơ" backHref={ROUTES.home}>
      <ProfileView />
    </UserPageShell>
  )
}
