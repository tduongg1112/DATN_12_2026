"use client"

import {
  Camera,
  Focus,
  Image as ImageIcon,
  Leaf,
  SunMedium,
} from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { ImageDropzone } from "@/components/ds/image-dropzone"
import { StatRow } from "@/components/ds/stat-row"
import { Button } from "@/components/ui/button"
import { CAPTURE_GUIDE, DIAGNOSIS_TEXT as T } from "@/lib/diagnosis/text"

const GUIDE_ICONS = [Leaf, Focus, SunMedium, ImageIcon]

/**
 * S1 Chọn ảnh (US-01, US-02; BR-01, BR-04). Desktop: dropzone 7 cột + hướng dẫn 5 cột.
 * Mobile: hướng dẫn, nút chính "Chụp ảnh", nút phụ "Tải ảnh lên".
 */
export function PickPhoto({
  onBrowse,
  onDropFile,
  onOpenCamera,
  error,
  busy,
}: {
  onBrowse: () => void
  onDropFile: (file: File) => void
  onOpenCamera: () => void
  error: string | null
  busy: boolean
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5">
      <Card notch className="hidden gap-4 lg:col-span-7 lg:grid">
        <ImageDropzone
          title={T.DROP_HINT}
          browseLabel={T.UPLOAD}
          hint={T.FILE_RULES}
          onBrowse={onBrowse}
          onDropFile={onDropFile}
          error={error}
          disabled={busy}
        />
        <Button
          variant="secondary"
          className="justify-self-center"
          onClick={onOpenCamera}
          disabled={busy}
        >
          <Camera aria-hidden />
          {T.TAKE_PHOTO}
        </Button>
      </Card>

      <Card notch className="lg:col-span-5">
        <h3 className="m-0 mb-4 type-h3">{T.GUIDE_TITLE}</h3>
        <ul className="m-0 grid list-none gap-3 p-0">
          {CAPTURE_GUIDE.map((title, i) => (
            <li key={title}>
              <StatRow icon={GUIDE_ICONS[i]} title={title} />
            </li>
          ))}
        </ul>
      </Card>

      {/* Mobile: trên điện thoại nút chính là chụp ảnh (design/05). */}
      <div className="grid gap-2 lg:hidden">
        <Button onClick={onOpenCamera} disabled={busy}>
          <Camera aria-hidden />
          {T.TAKE_PHOTO}
        </Button>
        <Button variant="secondary" onClick={onBrowse} disabled={busy}>
          {T.UPLOAD}
        </Button>
        {error && (
          <p role="alert" className="m-0 px-2 text-severe type-body-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
