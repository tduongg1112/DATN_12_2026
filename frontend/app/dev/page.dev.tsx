import Link from "next/link"

import { Card } from "@/components/ds/card-stack"

const LINKS = [
  ["/dev/design-check", "Thành phần design system"],
  ["/dev/shells/user?layout=hero", "Khung USER · Trung tâm"],
  ["/dev/shells/user?layout=list", "Khung USER · Danh sách"],
  ["/dev/shells/user?layout=detail", "Khung USER · Chi tiết"],
  ["/dev/shells/admin", "Khung ADMIN · Quản trị"],
  ["/dev/shells/form", "Khung Biểu mẫu"],
] as const

export default function DevIndex() {
  return (
    <main className="min-h-dvh bg-page p-[var(--gutter-mobile)] lg:p-8">
      <Card className="mx-auto max-w-xl">
        <h1 className="m-0 mb-4 type-h2">Trang kiểm tra (chỉ khi dev)</h1>
        <ul className="list">
          {LINKS.map(([href, label]) => (
            <li key={href} className="list-row">
              <Link
                href={href}
                className="list-row__main underline-offset-4 hover:underline"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  )
}
