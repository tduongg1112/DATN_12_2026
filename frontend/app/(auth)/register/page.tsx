import type { Metadata } from "next"
import { Construction } from "lucide-react"

import { EmptyState } from "@/components/ds/states"

export const metadata: Metadata = { title: "Tạo tài khoản" }

/** Trang tạm. Màn thật làm ở feature auth (specs_auth). */
export default function Page() {
  return (
    <>
      <h1 className="m-0 mb-6 type-h1">Tạo tài khoản</h1>
      <EmptyState icon={Construction} message="Trang đang được xây dựng." />
    </>
  )
}
