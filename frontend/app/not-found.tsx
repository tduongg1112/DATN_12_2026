import { SearchX } from "lucide-react"

import { EmptyState } from "@/components/ds/states"

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-page px-[var(--gutter-mobile)]">
      <EmptyState
        icon={SearchX}
        message="Không tìm thấy trang."
        action={{ label: "Về trang chủ", href: "/" }}
      />
    </main>
  )
}
