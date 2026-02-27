const API = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Pending saves for offline support
let offlineQueue = [];

function getToken() {
  return localStorage.getItem('sm_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(API + path, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem('sm_token');
      window.location.reload();
      throw new ApiError('세션이 만료되었습니다', 401);
    }

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || '요청이 너무 많습니다. 잠시 후 다시 시도해주세요', 429);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || `요청 실패 (${res.status})`, res.status);
    }

    // Handle file downloads
    if (res.headers.get('content-disposition')?.includes('attachment')) {
      return res;
    }

    return res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network error - queue important saves
    if (!navigator.onLine && options.method === 'PUT') {
      offlineQueue.push({ path, options, timestamp: Date.now() });
      console.warn('[Offline] Queued save:', path);
      return { ok: true, offline: true };
    }
    throw new ApiError('네트워크 오류가 발생했습니다', 0);
  }
}

// Flush offline queue when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    if (offlineQueue.length === 0) return;
    console.log(`[Online] Flushing ${offlineQueue.length} queued saves`);
    const queue = [...offlineQueue];
    offlineQueue = [];
    for (const item of queue) {
      try { await request(item.path, item.options); }
      catch (e) { console.error('[Flush failed]', e); }
    }
  });
}

// Convenience methods
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path, body) => request(path, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }),
  // Auth (no token needed)
  auth: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
};

export { ApiError };
