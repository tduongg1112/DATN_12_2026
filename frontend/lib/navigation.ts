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
  library: "/library",
  diagnose: "/diagnose",
  history: "/history",
  plants: "/plants",
  notifications: "/notifications",
  adminHome: "/admin",
  /** S1 Danh mục bệnh (design/screens/catalog.md). */
  catalog: "/admin/catalog",
  catalogCrops: "/admin/catalog/crops",
  catalogLabels: "/admin/catalog/labels",
} as const

/** S2 Thêm bệnh; `classCode` chọn sẵn mã lớp khi đi từ S6 "Nhãn mô hình". */
export function diseaseNewHref(classCode?: string): string {
  const base = `${ROUTES.catalog}/diseases/new`
  return classCode ? `${base}?classCode=${encodeURIComponent(classCode)}` : base
}

/** S2 Sửa bệnh (query string thay cho `[id]`, fe-coding-rules mục 3). */
export function diseaseEditHref(id: number): string {
  return `${ROUTES.catalog}/diseases/edit?id=${id}`
}

export function cropNewHref(): string {
  return `${ROUTES.catalogCrops}/new`
}

export function cropEditHref(id: number): string {
  return `${ROUTES.catalogCrops}/edit?id=${id}`
}

/** "Xem tất cả" kèm bộ lọc trên URL, để quay lại vẫn giữ bộ lọc (design/screens/disease_library.md S2). */
export function libraryHref(filter: {
  cropId?: number | null
  q?: string
}): string {
  const params = new URLSearchParams()
  if (filter.cropId) params.set("crop", String(filter.cropId))
  if (filter.q) params.set("q", filter.q)
  const query = params.toString()
  return query ? `${ROUTES.library}?${query}` : ROUTES.library
}

/** Trang chi tiết bệnh dùng query string thay cho `[id]` (fe-coding-rules mục 3). */
export function diseaseDetailHref(id: number): string {
  return `${ROUTES.library}/detail?id=${id}`
}

/** Đọc id dương từ query string (`?id=`, `?crop=`). Sai định dạng thì trả null. */
export function parsePositiveId(value: string | null): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null
  const id = Number(value)
  return id > 0 ? id : null
}

/** Mở chẩn đoán, chọn sẵn loại cây khi biết (OQ-05: chọn loại cây là bắt buộc). */
export function diagnoseHref(cropId?: number): string {
  return cropId ? `${ROUTES.diagnose}?cropId=${cropId}` : ROUTES.diagnose
}

/** Chẩn đoán từ hồ sơ cây (BR-24): loại cây khoá theo cây, kết quả tự gắn vào cây. */
export function diagnosePlantHref(plantId: number): string {
  return `${ROUTES.diagnose}?plantId=${plantId}`
}

/** Chi tiết, sửa, thêm cây (query string thay cho `[id]`, fe-coding-rules mục 3). */
export function plantDetailHref(id: number): string {
  return `${ROUTES.plants}/detail?id=${id}`
}

export function plantEditHref(id: number): string {
  return `${ROUTES.plants}/edit?id=${id}`
}

/** Thêm cây; `diagnosisId` thì tạo cây từ kết quả chẩn đoán (A2). */
export function plantNewHref(diagnosisId?: number): string {
  return diagnosisId
    ? `${ROUTES.plants}/new?diagnosisId=${diagnosisId}`
    : `${ROUTES.plants}/new`
}

/** Màn kết quả chẩn đoán, query string thay cho `[id]` (fe-coding-rules mục 3). */
export function diagnosisResultHref(id: number): string {
  return `${ROUTES.diagnose}/result?id=${id}`
}

/**
 * Lịch sử tra cứu kèm bộ lọc trên URL, để quay lại từ chi tiết vẫn giữ bộ lọc
 * (design/screens/history.md S1): `?q=&crop=&result=&from=&to=`.
 */
export function historyHref(filter: {
  q?: string
  cropId?: number | null
  resultType?: string | null
  fromDate?: string | null
  toDate?: string | null
}): string {
  const params = new URLSearchParams()
  if (filter.q) params.set("q", filter.q)
  if (filter.cropId) params.set("crop", String(filter.cropId))
  if (filter.resultType) params.set("result", filter.resultType)
  if (filter.fromDate) params.set("from", filter.fromDate)
  if (filter.toDate) params.set("to", filter.toDate)
  const query = params.toString()
  return query ? `${ROUTES.history}?${query}` : ROUTES.history
}

/** Chi tiết một lần tra cứu (fe-coding-rules mục 3). */
export function historyDetailHref(id: number): string {
  return `${ROUTES.history}/detail?id=${id}`
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
