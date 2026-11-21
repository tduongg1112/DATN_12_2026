import { ArrowRight, Droplets, Inbox, Leaf, Sprout, Sun } from "lucide-react"

import { Card, CardStack } from "@/components/ds/card-stack"
import { HealthStatus, StatusPill } from "@/components/ds/health-status"
import { StatRow } from "@/components/ds/stat-row"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import type { HealthStatus as HealthStatusValue } from "@/lib/types/domain"

const STATUSES: HealthStatusValue[] = [
  "NOT_DIAGNOSED",
  "HEALTHY",
  "DISEASED",
  "TREATING",
  "RECOVERED",
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid content-start gap-3">
      <h2 className="m-0 type-overline text-ink-secondary">{title}</h2>
      {children}
    </section>
  )
}

/** Bước 6 của design/08: so với design/preview/style-guide.html. */
export default function DesignCheck() {
  return (
    <main className="min-h-dvh bg-page px-[var(--gutter-mobile)] py-5 lg:px-8">
      <div className="mx-auto grid max-w-[var(--container-max)] gap-8">
        <header className="grid gap-2">
          <span className="tag w-fit">Kiểm tra giao diện</span>
          <h1 className="m-0 type-h1">Chẩn đoán bệnh lá cà chua</h1>
          <p className="m-0 max-w-prose text-ink-secondary type-body">
            Tiếng Việt đủ dấu: ắ ằ ẳ ẵ ặ ấ ầ ẩ ẫ ậ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ
            ứ ừ ử ữ ự ỳ ỷ ỹ ỵ đ Đ. Cây có khả năng bị bệnh mốc sương, độ tin cậy
            87%.
          </p>
        </header>

        <Section title="Nút">
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              Chụp ảnh lá <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
            <Button variant="accent">Lưu vào cây trồng</Button>
            <Button variant="secondary">Thử lại</Button>
            <Button variant="outline">Xem chi tiết</Button>
            <Button variant="ghost">Bỏ qua</Button>
            <Button variant="destructive">Xoá</Button>
            <Button disabled>Đang xử lý</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Nút nhỏ</Button>
            <Button size="lg">Nút lớn</Button>
            <Button size="icon" aria-label="Lá cây">
              <Leaf aria-hidden />
            </Button>
            <Button size="icon-sm" variant="secondary" aria-label="Tưới nước">
              <Droplets aria-hidden />
            </Button>
          </div>
        </Section>

        <Section title="Tình trạng sức khoẻ cây (Bảng 4.8)">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <HealthStatus key={s} status={s} />
            ))}
            <StatusPill tone="info">Thông tin</StatusPill>
          </div>
        </Section>

        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Cụm card trên nền xám (seam + notch)">
            <CardStack background="page">
              <Card>
                <h3 className="m-0 type-h3">Luống cà chua sau nhà</h3>
                <p className="m-0 mt-1 text-ink-secondary type-body-sm">
                  Trồng ngày 02/10/2026
                </p>
              </Card>
              <Card>
                <StatRow
                  icon={Sprout}
                  title="Lần chẩn đoán"
                  sub="30 ngày gần nhất"
                  value={12}
                  unit="lượt"
                />
                <StatRow
                  icon={Sun}
                  title="Độ tin cậy trung bình"
                  sub="Mô hình hiện tại"
                  value={86}
                  unit="%"
                  tone="neutral"
                />
              </Card>
            </CardStack>
          </Section>

          <Section title="Cụm card trên nền sage">
            <div className="rounded-xl bg-hero p-3">
              <CardStack background="hero">
                <Card>
                  <p className="m-0 type-title">Card đầu có notch</p>
                </Card>
                <Card>
                  <p className="m-0 type-title">Card nối bằng seam</p>
                </Card>
              </CardStack>
            </div>
          </Section>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <Section title="Trạng thái rỗng">
            <Card>
              <EmptyState
                icon={Inbox}
                message="Chưa có lần tra cứu nào."
                action={{ label: "Chụp lá đầu tiên", href: "/dev" }}
              />
            </Card>
          </Section>
          <Section title="Lỗi tải">
            <ErrorState message="Không tải được lịch sử. Thử lại." />
          </Section>
          <Section title="Đang tải">
            <Card className="grid gap-3">
              <Skeleton className="h-6 w-2/3 rounded-full" />
              <Skeleton className="h-24 rounded-lg" />
            </Card>
          </Section>
        </div>
      </div>
    </main>
  )
}
