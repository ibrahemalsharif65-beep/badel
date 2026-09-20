import { supabase } from './supabase'
import { BUCKETS } from './constants'

type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS]

export function publicUrl(bucket: Bucket, path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/**
 * Downscale + re-encode as JPEG before upload. Phone photos are often 4–10 MB;
 * this brings them to ~150–400 KB, which matters on mobile data and keeps us
 * far below the bucket's size limit.
 */
export async function compressImage(file: File, maxEdge = 1280, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')

  let bitmap: ImageBitmap | HTMLImageElement
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("We couldn't read that image. Try a JPG or PNG."))
      }
      img.src = url
    })
  }

  const w = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
  const h = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not supported in this browser.')
  ctx.fillStyle = '#fff' // flatten transparency for JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', quality),
  )
}

/** Compress + upload into `<bucket>/<userId>/<uuid>.jpg` (the only place RLS lets a user write). */
export async function uploadImage(bucket: Bucket, userId: string, file: File, opts?: { maxEdge?: number }) {
  const blob = await compressImage(file, opts?.maxEdge)
  const path = `${userId}/${uuid()}.jpg`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeImages(bucket: Bucket, paths: string[]) {
  if (!paths.length) return
  // Best-effort cleanup: a leftover file is harmless, a thrown error would block the user.
  await supabase.storage.from(bucket).remove(paths).catch(() => undefined)
}
