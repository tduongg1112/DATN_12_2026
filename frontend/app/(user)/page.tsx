import type { Metadata } from "next"

import { UserPageShell } from "@/components/layout/page-shells"
import { HomeHighlights } from "@/components/library/home-highlights"

export const metadata: Metadata = { title: "Trang chủ" }

/**
 * Trang chủ, khuôn "Trung tâm" (nền sage). Chuyên mục "Bệnh cây hay gặp" của feature
 * disease_library (design/screens/disease_library.md S1).
 */
export default function Page() {
  return (
    <UserPageShell layout="hero">
      <HomeHighlights />
    </UserPageShell>
  )
}
