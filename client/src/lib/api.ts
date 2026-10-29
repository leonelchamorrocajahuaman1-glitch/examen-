export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fields?: Record<string, string>,
    public details?: unknown,
  ) {
    super(message);
  }
}

const CSRF_COOKIE = 'nl_csrf';

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

let csrfPromise: Promise<void> | null = null;
async function ensureCsrf() {
  if (readCookie(CSRF_COOKIE)) return;
  csrfPromise ??= fetch('/api/auth/csrf', { credentials: 'include' })
    .then(() => undefined)
    .finally(() => {
      csrfPromise = null;
    });
  await csrfPromise;
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

export async function api<T>(path: string, { method = 'GET', body, form, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    await ensureCsrf();
    headers['X-CSRF-Token'] = decodeURIComponent(readCookie(CSRF_COOKIE) ?? '');
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('No se pudo conectar con el servidor. Verifica que la API esté encendida.', 0, 'NETWORK');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(
      e.message ?? `Error ${res.status}`,
      res.status,
      e.code,
      e.details?.fields,
      e.details,
    );
  }
  return data as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null | string[]>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
