"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Leaf } from "lucide-react"

import {
  Card,
  CardStack,
  type SeamBackground,
} from "@/components/ds/card-stack"
import { HealthStatus } from "@/components/ds/health-status"
import { UserPageShell, type UserLayout } from "@/components/layout/page-shells"

const TITLES: Record<UserLayout, string | undefined> = {
  hero: undefined,
  list: "Cây trồng của tôi",
  detail: "Luống cà chua",
}
const SEAM: Record<UserLayout, SeamBackground> = {
  hero: "hero",
  list: "page",
  detail: "detail",
}

function Preview() {
  const param = useSearchParams().get("layout")
  const layout: UserLayout =
    param === "list" || param === "detail" ? param : "hero"
  return (
    <UserPageShell
      layout={layout}
      title={TITLES[layout]}
      backHref={layout === "detail" ? "/dev" : undefined}
    >
      <CardStack background={SEAM[layout]}>
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="flex items-center gap-3">
            <span className="icon-tile" aria-hidden>
              <Leaf size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 type-title">Cây mẫu số {i + 1}</p>
              <p className="m-0 text-ink-secondary type-caption">
                Chẩn đoán gần nhất: hôm nay
              </p>
            </div>
            <HealthStatus status={i % 2 ? "HEALTHY" : "DISEASED"} />
          </Card>
        ))}
      </CardStack>
      <p className="mt-5 text-ink-secondary type-body-sm">
        Dòng cuối trang: phải nhìn thấy, không bị dock che.
      </p>
    </UserPageShell>
  )
}

/** Khung USER không qua RequireAuth, chỉ để xem bố cục khi dev. */
export default function UserShellPreview() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  )
}
