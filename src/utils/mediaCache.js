// Simple media caching for project photos/videos using the Cache API.
// We fetch the remote URL, put it in a versioned cache, and return a blob URL
// so the browser doesn't re-download the asset next time.

const CACHE_NAME = 'rw-media-v1'

function buildRequestUrl(projectId, token, remoteUrl) {
  // Normalize as absolute by reusing the current origin if needed
  try {
    const u = new URL(remoteUrl, window.location.origin)
    // Add a stable query to avoid server caches interfering but keep a fixed key
    u.searchParams.set('pid', String(projectId))
    u.searchParams.set('tok', String(token))
    return u.toString()
  } catch {
    return remoteUrl
  }
}

export async function getCachedObjectUrlForMedia(projectId, token, remoteUrl) {
  if (!projectId || !token || !remoteUrl || typeof caches === 'undefined') return remoteUrl
  const reqUrl = buildRequestUrl(projectId, token, remoteUrl)
  const cache = await caches.open(CACHE_NAME)
  // Try cache first
  const cached = await cache.match(reqUrl)
  if (cached) {
    const blob = await cached.blob()
    return URL.createObjectURL(blob)
  }
  // Fetch fresh and cache
  const res = await fetch(remoteUrl, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  try { await cache.put(reqUrl, res.clone()) } catch {}
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function removeCachedMedia(projectId, token, remoteUrl) {
  if (typeof caches === 'undefined') return false
  const reqUrl = buildRequestUrl(projectId, token, remoteUrl)
  try {
    const cache = await caches.open(CACHE_NAME)
    return cache.delete(reqUrl)
  } catch {
    return false
  }
}

