import {
  BookOpen,
  Camera,
  FolderTree,
  History,
  House,
  LayoutDashboard,
  Sprout,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** true: chỉ đánh dấu đang chọn khi trùng đường dẫn tuyệt đối. */
  exact?: boolean
}

/** Dock của khu người dùng: trang chủ + 4 UC (UC02–UC05). */
export const USER_NAV: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: House, exact: true },
  { href: "/diagnose", label: "Chẩn đoán", icon: Camera },
  { href: "/history", label: "Lịch sử tra cứu", icon: History },
  { href: "/plants", label: "Cây trồng của tôi", icon: Sprout },
  { href: "/library", label: "Thư viện bệnh", icon: BookOpen },
]

/** Dock của khu quản trị. ADMIN dùng được khu người dùng (OQ-22). */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/catalog", label: "Danh mục", icon: FolderTree },
  { href: "/", label: "Khu người dùng", icon: Users, exact: true },
]

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  profile: "/profile",
  adminHome: "/admin",
} as const

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
