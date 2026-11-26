"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { cropNewHref, diseaseNewHref } from "@/lib/navigation"

/** Nút chính "Thêm bệnh" trên thanh đầu trang S1 (C4 bước 3). */
export function AddDiseaseAction() {
  return (
    <Button
      size="sm"
      nativeButton={false}
      render={<Link href={diseaseNewHref()} />}
    >
      {T.ADD_DISEASE}
    </Button>
  )
}

/** Nút chính "Thêm loại cây" trên thanh đầu trang S4. */
export function AddCropAction() {
  return (
    <Button
      size="sm"
      nativeButton={false}
      render={<Link href={cropNewHref()} />}
    >
      {T.ADD_CROP}
    </Button>
  )
}
