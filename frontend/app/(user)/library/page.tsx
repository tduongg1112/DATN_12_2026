import { Suspense } from "react"
import type { Metadata } from "next"

import { UserPageShell } from "@/components/layout/page-shells"
import {
  LibraryListSkeleton,
  LibraryListView,
} from "@/components/library/library-list-view"
import { LIBRARY_TEXT } from "@/lib/library/text"

export const metadata: Metadata = { title: LIBRARY_TEXT.SECTION_TITLE }

/**
 * S2 "Bệnh cây hay gặp" (Xem tất cả), khuôn "Danh sách" (design/screens/disease_library.md).
 * Bộ lọc đọc từ `?crop=&q=` nên bọc Suspense (Next 16).
 */
export default function Page() {
  return (
    <UserPageShell layout="list" title={LIBRARY_TEXT.SECTION_TITLE}>
      <Suspense fallback={<LibraryListSkeleton />}>
        <LibraryListView />
      </Suspense>
    </UserPageShell>
  )
}
