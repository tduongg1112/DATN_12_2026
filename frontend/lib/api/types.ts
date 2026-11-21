/** Danh sách phân trang (TD-05). */
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
