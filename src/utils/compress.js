// Image and video compression utilities with progress (browser-only)

// Helper: sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Compress image to <= targetBytes by iterative quality reduction and optional downscale
export async function compressImageWithProgress(file, targetBytes = 100 * 1024, onProgress) {
  try {
    const readAsDataURL = (f) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f) })
    const srcUrl = await readAsDataURL(file)
    onProgress?.(5)
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = srcUrl })

    // Start from current image; progressively reduce size
    let width = img.width
    let height = img.height
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // Initial scale: try to limit max dimension to 1600 to speed up
    const maxDim = 1600
    const scale0 = Math.min(1, maxDim / Math.max(width, height))
    width = Math.max(1, Math.round(width * scale0))
    height = Math.max(1, Math.round(height * scale0))
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.85
    let step = 0
    let outBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    onProgress?.(10)

    // Reduce quality until under target or quality too low
    while (outBlob && outBlob.size > targetBytes && quality > 0.4) {
      quality = Math.max(0.4, quality - 0.08)
      outBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
      step += 1
      onProgress?.(Math.min(60, 10 + Math.round(step * 8)))
      await sleep(0)
    }

    // If still bigger, downscale further and continue
    let downSteps = 0
    while (outBlob && outBlob.size > targetBytes && (width > 320 || height > 320)) {
      width = Math.max(320, Math.round(width * 0.85))
      height = Math.max(320, Math.round(height * 0.85))
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      outBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
      downSteps += 1
      onProgress?.(Math.min(90, 60 + downSteps * 6))
      await sleep(0)
    }

    if (!outBlob) return file

    const outFile = new File([outBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() })
    onProgress?.(100)
    return outFile
  } catch (e) {
    onProgress?.(100)
    return file
  }
}

// Compress video using MediaRecorder and canvas capture to approximate <= targetBytes.
// Note: This may drop audio and depends on browser support for MediaRecorder and canvas.captureStream.
export async function compressVideoWithProgress(file, targetBytes = 10 * 1024 * 1024, onProgress) {
  try {
    if (typeof file.size === 'number' && file.size <= targetBytes) {
      onProgress?.(100)
      return file
    }

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      const onMeta = () => resolve()
      const onErr = (e) => reject(e)
      video.addEventListener('loadedmetadata', onMeta, { once: true })
      video.addEventListener('error', onErr, { once: true })
    })

    const duration = Math.max(0.1, video.duration || 1)
    const vw = video.videoWidth || 1280
    const vh = video.videoHeight || 720

    // Determine initial scale and bitrate from target
    let targetBps = Math.max(200_000, Math.floor((targetBytes * 8) / duration)) // bits per second
    let scaleW = Math.min(1280, vw)

    const encodeOnce = async (bps, width) => {
      const height = Math.round((vh / vw) * width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(2, width - (width % 2))
      canvas.height = Math.max(2, height - (height % 2))
      const ctx = canvas.getContext('2d')

      const fps = 25
      const stream = canvas.captureStream ? canvas.captureStream(fps) : null
      if (!stream) throw new Error('Canvas captureStream not supported')

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      const mime = mimeTypes.find(m => MediaRecorder.isTypeSupported?.(m)) || 'video/webm'
      let recorder
      try {
        recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps })
      } catch {
        recorder = new MediaRecorder(stream)
      }

      const chunks = []
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }

      let rafId
      let stopped = false
      const draw = () => {
        if (stopped) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const pct = Math.min(95, Math.round((video.currentTime / duration) * 95))
        onProgress?.(pct)
        rafId = requestAnimationFrame(draw)
      }

      await video.play()
      recorder.start(100)
      draw()

      await new Promise(resolve => {
        video.onended = () => resolve()
        video.onerror = () => resolve()
      })

      // Stop everything
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      recorder.stop()
      await new Promise(res => { recorder.onstop = () => res() })

      const blob = new Blob(chunks, { type: mime })
      onProgress?.(100)
      const out = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), { type: blob.type, lastModified: Date.now() })
      return out
    }

    // First try
    let out = await encodeOnce(targetBps, scaleW)
    if (out.size <= targetBytes) return out

    // Second attempt, lower settings
    out = await encodeOnce(Math.max(120_000, Math.floor(targetBps * 0.7)), Math.max(480, Math.floor(scaleW * 0.75)))
    if (out.size <= targetBytes) return out

    // Return the better (smaller) of the two
    return (out.size < file.size ? out : file)
  } catch (e) {
    onProgress?.(100)
    return file
  } finally {
    try { URL.revokeObjectURL(url) } catch {}
  }
}
