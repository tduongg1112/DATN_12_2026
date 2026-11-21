import { CameraError, type CameraService, type CameraSession } from "./camera"

function toCameraError(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : ""
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new CameraError("permission_denied", "Chưa được cấp quyền camera")
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new CameraError("not_found", "Không tìm thấy camera")
  }
  return new CameraError("unknown", String(error))
}

/** Bản cài trên trình duyệt, dùng `getUserMedia`. */
export const webCamera: CameraService = {
  isSupported() {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    )
  },

  async start(video: HTMLVideoElement): Promise<CameraSession> {
    if (!this.isSupported()) {
      throw new CameraError("not_supported", "Trình duyệt không hỗ trợ camera")
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
    } catch (error) {
      throw toCameraError(error)
    }
    video.srcObject = stream
    video.playsInline = true
    video.muted = true
    await video.play()

    const stop = () => {
      stream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }

    return {
      stop,
      capture: () =>
        new Promise<Blob>((resolve, reject) => {
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          if (!ctx || !canvas.width) {
            reject(new CameraError("unknown", "Chưa có khung hình từ camera"))
            return
          }
          ctx.drawImage(video, 0, 0)
          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new CameraError("unknown", "Không chụp được ảnh")),
            "image/jpeg",
            0.95
          )
        }),
    }
  },
}
