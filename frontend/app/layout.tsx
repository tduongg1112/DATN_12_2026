import type { Metadata, Viewport } from "next"
import { Be_Vietnam_Pro } from "next/font/google"

import "./globals.css"
import { Providers } from "@/components/providers"
import { cn } from "@/lib/utils"

// design/02: font duy nhất, có bộ vietnamese. next/font tự host, không cần gói thêm.
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-be-vietnam",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Hệ thống hỗ trợ quản lý sức khoẻ cây trồng",
    template: "%s · Sức khoẻ cây trồng",
  },
  description:
    "Chẩn đoán bệnh trên lá cây qua hình ảnh, theo dõi và chăm sóc cây trồng.",
}

// design/06: viewport-fit=cover cho safe-area; theme-color = --bg-hero (#E1E3D7).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E1E3D7",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("antialiased", beVietnam.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
