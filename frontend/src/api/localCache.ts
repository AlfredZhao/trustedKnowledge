const API_CACHE_PREFIX = "trustedKnowledge.apiCache.v1:";
const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_API_CACHE_ENTRIES = 120;

interface CachedApiEntry<T> {
  savedAt: number;
  data: T;
}

export function buildApiCacheKey(path: string, apiKey: string | null): string {
  return `${API_CACHE_PREFIX}${hashCacheScope(apiKey ?? "anonymous")}:${path}`;
}

export function readCachedApiResponse<T>(cacheKey: string, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS): T | null {
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CachedApiEntry<T>;
    if (!entry || typeof entry.savedAt !== "number") return null;
    if (Date.now() - entry.savedAt > maxAgeMs) return null;

    return entry.data;
  } catch {
    window.localStorage.removeItem(cacheKey);
    return null;
  }
}

export function writeCachedApiResponse<T>(cacheKey: string, data: T) {
  try {
    const entry: CachedApiEntry<T> = {
      savedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
    pruneApiResponseCache();
  } catch {
    // Cache pressure should never block the live API path.
  }
}

export function clearApiResponseCache() {
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(API_CACHE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Cache cleanup is best effort.
  }
}

export function invalidateApiResponseCache(pathPrefixes: string[]) {
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(API_CACHE_PREFIX)) continue;

      const cachePath = readCachePath(key);
      if (cachePath && pathPrefixes.some((prefix) => cachePath.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Cache cleanup is best effort.
  }
}

function hashCacheScope(scope: string): string {
  let hash = 0;
  for (let index = 0; index < scope.length; index += 1) {
    hash = (hash * 31 + scope.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function readCachePath(cacheKey: string): string | null {
  const marker = ":/api/";
  const index = cacheKey.indexOf(marker);
  return index >= 0 ? cacheKey.slice(index + 1) : null;
}

function pruneApiResponseCache() {
  const cacheEntries: Array<{ key: string; savedAt: number }> = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(API_CACHE_PREFIX)) continue;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const entry = JSON.parse(raw) as CachedApiEntry<unknown>;
      if (!entry || typeof entry.savedAt !== "number") {
        window.localStorage.removeItem(key);
        continue;
      }
      cacheEntries.push({ key, savedAt: entry.savedAt });
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  if (cacheEntries.length <= MAX_API_CACHE_ENTRIES) return;

  cacheEntries
    .sort((left, right) => left.savedAt - right.savedAt)
    .slice(0, cacheEntries.length - MAX_API_CACHE_ENTRIES)
    .forEach((entry) => {
      window.localStorage.removeItem(entry.key);
    });
}
