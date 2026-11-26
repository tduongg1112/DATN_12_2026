"use client"

import Link from "next/link"
import { Menu } from "@base-ui/react/menu"
import { LogOut, UserRound } from "lucide-react"

import { Avatar } from "@/components/ds/avatar"
import { useAuth } from "@/lib/auth"
import { ROUTES } from "@/lib/navigation"

const ITEM =
  "flex min-h-[var(--ctl-sm)] cursor-pointer items-center gap-3 rounded-full px-4 type-body outline-none select-none data-highlighted:bg-surface-sunken"

/**
 * S3 Menu ảnh đại diện (design/screens/auth.md; BR-12, US-05). Bấm avatar → "Hồ sơ",
 * "Đăng xuất". Đăng xuất: thu hồi phiên rồi về màn đăng nhập (RequireAuth chuyển trang).
 */
export function UserMenu() {
  const { profile, signOut } = useAuth()

  return (
    <Menu.Root>
      <Menu.Trigger className="shrink-0 rounded-full" aria-label="Tài khoản">
        <Avatar src={profile?.avatarUrl} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={10}
          className="z-[var(--z-sheet)] outline-none"
        >
          <Menu.Popup className="w-72 max-w-[calc(100vw-2*var(--gutter-mobile))] origin-[var(--transform-origin)] rounded-lg bg-surface p-2 shadow-float transition-[opacity,transform] duration-[var(--dur-fast)] ease-[var(--ease-standard)] outline-none data-ending-style:opacity-0 data-starting-style:scale-[.98] data-starting-style:opacity-0">
            {profile && (
              <div className="px-4 pt-2 pb-3">
                <p className="m-0 truncate type-title">{profile.fullName}</p>
                <p className="m-0 truncate text-ink-secondary type-caption">
                  {profile.email}
                </p>
              </div>
            )}
            <Menu.Separator className="mx-2 mb-1 border-t border-dashed border-line" />
            <Menu.LinkItem
              className={ITEM}
              closeOnClick
              render={<Link href={ROUTES.profile} />}
            >
              <UserRound size={20} aria-hidden />
              Hồ sơ
            </Menu.LinkItem>
            <Menu.Item className={ITEM} onClick={() => void signOut()}>
              <LogOut size={20} aria-hidden />
              Đăng xuất
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
