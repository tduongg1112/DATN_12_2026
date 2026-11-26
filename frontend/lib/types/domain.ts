/** Kiểu dùng chung, khớp tập giá trị ở docs/_shared/data_model.md mục 1. */
export type Role = "USER" | "ADMIN"

export type HealthStatus =
  "NOT_DIAGNOSED" | "HEALTHY" | "DISEASED" | "TREATING" | "RECOVERED"

/** Mức độ nguy hại của bệnh (`diseases.severity`). */
export type Severity = "LOW" | "MEDIUM" | "HIGH"

/** Nhóm tác nhân (`diseases.pathogen_group`). */
export type PathogenGroup =
  "FUNGUS" | "BACTERIA" | "VIRUS" | "PEST" | "PHYSIOLOGICAL"
