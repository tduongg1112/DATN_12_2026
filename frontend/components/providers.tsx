"use client"

import * as React from "react"

import { OfflineBanner } from "@/components/ds/states"
import { ToastProvider } from "@/components/ds/toast"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"

/** Provider dùng chung cho toàn app (client). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <OfflineBanner />
          {children}
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
