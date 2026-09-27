export const safetyMessageImageBucket = 'safety-message-images'

export const safetyMessageImageMaxBytes = 5 * 1024 * 1024

const stockImagePath = '/images/aviation-safety.png'

const allowedTypes = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export function heroImageUrl(value: string | null | undefined) {
  const url = value?.trim() ?? ''
  if (!url || url.endsWith(stockImagePath)) return ''
  return url
}

export function imageExtension(file: File) {
  return allowedTypes.get(file.type) ?? null
}

export function storageObjectPath(publicUrl: string) {
  const marker = `/storage/v1/object/public/${safetyMessageImageBucket}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  const path = decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0] ?? '')
  if (!path || path.includes('..')) return null
  return path
}
