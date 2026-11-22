"use client"

import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"

import { Card, CardStack } from "@/components/ds/card-stack"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { libraryApi } from "@/lib/api/library"
import { HOME_CARD_COUNT, LIBRARY_TEXT } from "@/lib/library/text"
import { ROUTES } from "@/lib/navigation"

import { DiseaseCard } from "./disease-card"

const TITLE_ID = "home-diseases-title"

/**
 * S1 Trang chủ, chuyên mục "Bệnh cây hay gặp" (design/screens/disease_library.md; US-01;
 * BR-02, 03, 04, 08, 10). Thẻ đầu lớn, các thẻ còn lại dạng hàng; desktop 7 + 5 cột.
 */
export function HomeHighlights() {
  const { data, error, reload } = useApiRequest("home-diseases", (signal) =>
    libraryApi.diseases({ page: 1, pageSize: HOME_CARD_COUNT }, signal)
  )

  if (error) return <ErrorState message={error.message} onRetry={reload} />
  if (!data) return <HomeHighlightsSkeleton />

  // BR-10: chưa có bệnh công khai thì ẩn chuyên mục; trang còn trống nên hiện trạng thái
  // rỗng kèm lối sang chẩn đoán (OQ-38).
  if (data.total === 0 || data.items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          message={LIBRARY_TEXT.HOME_EMPTY}
          action={{
            label: LIBRARY_TEXT.DIAGNOSE_BY_IMAGE,
            href: ROUTES.diagnose,
          }}
        />
      </Card>
    )
  }

  const [first, ...rest] = data.items
  return (
    <section aria-labelledby={TITLE_ID} className="grid gap-3 lg:gap-5">
      <div className="flex min-h-[var(--ctl-md)] items-center justify-between gap-3">
        <h2 id={TITLE_ID} className="m-0 type-h2">
          {LIBRARY_TEXT.SECTION_TITLE}
        </h2>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={ROUTES.library} />}
        >
          {LIBRARY_TEXT.SEE_ALL}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
      </div>
      <CardStack background="hero" className="lg:grid-cols-12 lg:items-start">
        <Card className="lg:col-span-7">
          <DiseaseCard disease={first} variant="feature" />
        </Card>
        {rest.length > 0 && (
          <Card className="lg:col-span-5">
            <ul className="m-0 grid list-none p-0">
              {rest.map((disease) => (
                <li
                  key={disease.id}
                  className="border-t border-dashed border-line py-4 first:border-0 first:pt-0 last:pb-0"
                >
                  <DiseaseCard disease={disease} variant="row" />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </CardStack>
    </section>
  )
}

function HomeHighlightsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-3 lg:gap-5">
      <span className="sr-only">Đang tải</span>
      <Skeleton className="h-[var(--ctl-md)] w-64 max-w-full rounded-full" />
      <div className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5">
        <Card className="grid gap-4 lg:col-span-7">
          <Skeleton className="aspect-[16/10] rounded-xl" />
          <Skeleton className="h-7 w-2/3 rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
        </Card>
        <Card className="grid gap-4 lg:col-span-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-21 shrink-0 rounded-md" />
              <div className="grid flex-1 content-start gap-2">
                <Skeleton className="h-5 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
