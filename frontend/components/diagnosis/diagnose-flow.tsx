"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { CardStack } from "@/components/ds/card-stack"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { libraryApi } from "@/lib/api/library"
import { plantsApi } from "@/lib/api/plants"
import { device, IMAGE_RULES, validateImageFile } from "@/lib/device"
import {
  exportEdited,
  INITIAL_EDIT,
  type EditState,
} from "@/lib/diagnosis/image-edit"
import { rememberResult } from "@/lib/diagnosis/result-cache"
import { DIAGNOSIS_TEXT as T } from "@/lib/diagnosis/text"
import { PLANTS_TEXT } from "@/lib/plants/text"
import { diagnosisResultHref, parsePositiveId } from "@/lib/navigation"
import type { CreateDiagnosisInput } from "@/lib/types/diagnosis"

import { AnalysisErrorPanel, AnalyzingPanel } from "./analysis-status"
import { CameraView } from "./camera-view"
import { CropPicker } from "./crop-picker"
import { EditTools, ImageEditor } from "./image-editor"
import { PickPhoto } from "./pick-photo"

interface Photo {
  /** Ảnh đã chọn hoặc chụp, đã nén (TD-17). Gửi lên làm ảnh gốc. */
  original: Blob
  bitmap: ImageBitmap
}

type Submission =
  | { status: "idle" }
  | { status: "analyzing"; attempt: number }
  /** `retryable`: lỗi tạm thời, gửi lại được đúng ảnh cũ (TD-26). */
  | { status: "error"; message: string; retryable: boolean }

/** Lỗi do ảnh: chỉ còn cách chụp lại (design/screens/diagnosis.md S4). */
const IMAGE_ERROR_CODES = new Set([
  "AI_IMAGE_REJECTED",
  "INVALID_IMAGE_TYPE",
  "IMAGE_TOO_LARGE",
])
/** Lỗi loại cây: báo dưới hàng chip. */
const CROP_ERROR_CODES = new Set(["VALIDATION_ERROR", "CROP_NOT_FOUND"])

/**
 * Luồng chẩn đoán trên `/diagnose` (UC02): S1 chọn ảnh → S2 máy ảnh → S3 chỉnh ảnh, chọn
 * loại cây → S4 đang phân tích → `/diagnose/result?id=`. Ảnh chỉ nằm trong bộ nhớ, tải lại
 * trang thì về S1. `?cropId=` chọn sẵn loại cây (OQ-05). `?plantId=` chẩn đoán từ hồ sơ
 * cây (BR-24): khoá loại cây theo cây, kết quả tự gắn vào cây; cây không mở được thì chẩn
 * đoán như thường. Đọc `useSearchParams` nên trang
 * phải bọc `<Suspense>`.
 */
export function DiagnoseFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const crops = useApiRequest("crops", (signal) => libraryApi.crops(signal))
  const plantIdParam = parsePositiveId(searchParams.get("plantId"))
  const plantRequest = useApiRequest(
    plantIdParam === null ? null : `plant:${plantIdParam}`,
    (signal) => plantsApi.get(plantIdParam ?? 0, signal)
  )
  const plant =
    plantRequest.data?.id === plantIdParam ? plantRequest.data : null
  /** Đang chờ thông tin cây thì chưa hiện chip loại cây. */
  const waitingPlant = plantIdParam !== null && !plant && !plantRequest.error

  const [cameraOpen, setCameraOpen] = React.useState(false)
  const [photo, setPhoto] = React.useState<Photo | null>(null)
  const [edit, setEdit] = React.useState<EditState>(INITIAL_EDIT)
  const [cropId, setCropId] = React.useState<number | null>(() =>
    parsePositiveId(searchParams.get("cropId"))
  )
  const [cropError, setCropError] = React.useState<string | null>(null)
  const [pickError, setPickError] = React.useState<string | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [submission, setSubmission] = React.useState<Submission>({
    status: "idle",
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const controllerRef = React.useRef<AbortController | null>(null)
  const uploadRef = React.useRef<CreateDiagnosisInput | null>(null)

  // Loại cây chọn sẵn từ URL chỉ dùng khi còn trong danh sách đang hiện.
  const selectedCropId = plant
    ? plant.crop.id
    : cropId !== null && crops.data?.some((c) => c.id === cropId)
      ? cropId
      : null

  // Giải phóng ảnh cũ khi đổi ảnh hoặc rời trang.
  React.useEffect(() => () => photo?.bitmap.close(), [photo])
  // Rời trang khi đang chờ AI: ngừng chờ.
  React.useEffect(() => () => controllerRef.current?.abort(), [])

  function openFilePicker() {
    const input = fileInputRef.current
    if (!input) return
    input.value = ""
    input.click()
  }

  async function loadPhoto(image: Blob) {
    setPreparing(true)
    setPickError(null)
    try {
      const original = await device.images.compress(image)
      if (original.size > IMAGE_RULES.maxBytes) throw new Error("too large")
      const bitmap = await createImageBitmap(original, {
        imageOrientation: "from-image",
      })
      setPhoto({ original, bitmap })
      setEdit(INITIAL_EDIT)
      setSubmission({ status: "idle" })
    } catch {
      // Tệp hỏng hoặc trình duyệt không đọc được: cùng câu BR-04.
      setPickError(IMAGE_RULES.message)
    } finally {
      setPreparing(false)
    }
  }

  function handleFile(file: File) {
    const invalid = validateImageFile(file)
    if (invalid) {
      setPickError(invalid)
      return
    }
    void loadPhoto(file)
  }

  function retake() {
    controllerRef.current?.abort()
    uploadRef.current = null
    setPhoto(null)
    setSubmission({ status: "idle" })
  }

  function send() {
    const input = uploadRef.current
    if (!input) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setSubmission((prev) => ({
      status: "analyzing",
      attempt: (prev.status === "analyzing" ? prev.attempt : 0) + 1,
    }))
    diagnosesApi.create(input, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        rememberResult(result)
        router.push(diagnosisResultHref(result.id))
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (isApiError(error) && CROP_ERROR_CODES.has(error.code)) {
          setCropError(fieldErrors(error).cropId ?? error.message)
          setSubmission({ status: "idle" })
          crops.reload()
          return
        }
        setSubmission({
          status: "error",
          message: isApiError(error)
            ? error.message
            : CLIENT_ERRORS.INTERNAL_ERROR,
          retryable: !(isApiError(error) && IMAGE_ERROR_CODES.has(error.code)),
        })
      }
    )
  }

  async function submit() {
    if (!photo) return
    if (selectedCropId === null) {
      setCropError(T.CROP_REQUIRED)
      return
    }
    setCropError(null)
    try {
      const processed = await exportEdited(photo.bitmap, edit)
      uploadRef.current = {
        original: photo.original,
        processed,
        cropId: selectedCropId,
        plantId: plant?.id,
      }
    } catch {
      setSubmission({
        status: "error",
        message: CLIENT_ERRORS.INTERNAL_ERROR,
        retryable: false,
      })
      return
    }
    send()
  }

  function cancel() {
    controllerRef.current?.abort()
    setSubmission({ status: "idle" })
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_RULES.types.join(",")}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {cameraOpen && (
        <CameraView
          onCapture={(image) => {
            setCameraOpen(false)
            void loadPhoto(image)
          }}
          onUpload={() => {
            setCameraOpen(false)
            openFilePicker()
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {!photo ? (
        <PickPhoto
          onBrowse={openFilePicker}
          onDropFile={handleFile}
          onOpenCamera={() => setCameraOpen(true)}
          error={pickError}
          busy={preparing}
        />
      ) : (
        // Mobile: chừa chỗ cho nút "Tiếp tục" dính đáy trên dock.
        <div className="grid gap-2 pb-[calc(var(--ctl-md)+var(--s-3))] lg:grid-cols-12 lg:items-start lg:gap-5 lg:pb-0">
          <ImageEditor
            image={photo.bitmap}
            edit={edit}
            onChange={setEdit}
            disabled={submission.status !== "idle"}
            className="lg:col-span-7 lg:max-w-[640px]"
          />
          <div className="grid min-w-0 gap-2 lg:col-span-5 lg:gap-5">
            {submission.status === "idle" && (
              <>
                <CardStack background="detail">
                  <EditTools
                    edit={edit}
                    onChange={setEdit}
                    image={photo.bitmap}
                    onRetake={retake}
                  />
                  <CropPicker
                    crops={
                      plant
                        ? [plant.crop]
                        : waitingPlant
                          ? undefined
                          : crops.data
                    }
                    note={plant ? PLANTS_TEXT.DIAGNOSE_FOR(plant.name) : null}
                    loadError={crops.error}
                    onReload={crops.reload}
                    value={selectedCropId}
                    onChange={(id) => {
                      setCropId(id)
                      setCropError(null)
                    }}
                    error={cropError}
                  />
                </CardStack>
                <div className="fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 lg:static">
                  <Button className="w-full" onClick={submit}>
                    {T.CONTINUE}
                  </Button>
                </div>
              </>
            )}
            {submission.status === "analyzing" && (
              <AnalyzingPanel key={submission.attempt} onCancel={cancel} />
            )}
            {submission.status === "error" && (
              <AnalysisErrorPanel
                message={submission.message}
                onRetry={submission.retryable ? send : undefined}
                onRetake={retake}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
