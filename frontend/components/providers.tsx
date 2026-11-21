"use client"

import * as React from "react"

import { OfflineBanner } from "@/components/ds/states"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"

/** Provider dùng chung cho toàn app (client). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineBanner />
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
