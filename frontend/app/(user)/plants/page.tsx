import type { Metadata } from "next"

import { UserPageShell } from "@/components/layout/page-shells"
import {
  AddPlantAction,
  PlantsListView,
} from "@/components/plants/plants-list-view"
import { PLANTS_TEXT } from "@/lib/plants/text"

export const metadata: Metadata = { title: PLANTS_TEXT.PAGE_TITLE }

/** S1 Cây trồng của tôi `/plants` (UC04), khuôn "Danh sách" (design/screens/my_plants.md). */
export default function Page() {
  return (
    <UserPageShell
      layout="list"
      title={PLANTS_TEXT.PAGE_TITLE}
      actions={<AddPlantAction />}
    >
      <PlantsListView />
    </UserPageShell>
  )
}
