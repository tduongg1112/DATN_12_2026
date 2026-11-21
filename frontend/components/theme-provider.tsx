"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/** design/README: v1 chỉ có light mode. Khoá cứng, không có phím tắt đổi theme. */
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
