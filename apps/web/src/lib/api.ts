const clientApiBaseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://127.0.0.1:8000';
const serverApiBaseUrl = process.env['API_URL_INTERNAL'] ?? clientApiBaseUrl;
const defaultApiTimeoutMs = Number.parseInt(
  process.env['NEXT_PUBLIC_API_TIMEOUT_MS'] ?? '20000',
  10,
);

function getApiBaseUrl(): string {
  return typeof window === 'undefined' ? serverApiBaseUrl : clientApiBaseUrl;
}

interface ApiError extends Error {
  status: number;
  data?: unknown;
}

function createApiError(message: string, status: number, data?: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.data = data;
  return error;
}

interface ErrorResponseData {
  detail?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data: ErrorResponseData = (await response.json().catch(() => ({}))) as ErrorResponseData;
    throw createApiError(data.detail ?? response.statusText, response.status, data);
  }
  return response.json() as Promise<T>;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(defaultApiTimeoutMs) ? Math.max(defaultApiTimeoutMs, 0) : 20000;
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          controller.abort();
        }, timeoutMs)
      : null;

  const externalSignal = options.signal;
  let onExternalAbort: (() => void) | null = null;
  if (externalSignal) {
    onExternalAbort = () => {
      controller.abort();
    };
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createApiError(`Request timed out after ${timeoutMs.toString()}ms`, 504);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

function mergeHeaders(base: HeadersInit, additional?: HeadersInit): HeadersInit {
  const result: Record<string, string> = {};

  const processHeaders = (headers: HeadersInit | undefined): void => {
    if (!headers) return;
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else {
      Object.assign(result, headers);
    }
  };

  processHeaders(base);
  processHeaders(additional);
  return result;
}

// Shape of persisted Zustand auth store
interface PersistedAuthState {
  state: {
    token?: string;
  };
}

function isPersistedAuthState(value: unknown): value is PersistedAuthState {
  if (typeof value !== 'object' || value === null) return false;
  if (!('state' in value)) return false;
  const state = (value as { state: unknown }).state;
  return typeof state === 'object' && state !== null;
}

// Get auth token from localStorage (for use outside React components)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('office-detective-auth');
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isPersistedAuthState(parsed)) {
        const { token } = parsed.state;
        return typeof token === 'string' ? token : null;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetchWithTimeout(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: 'GET',
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', ...getAuthHeaders() },
        options?.headers,
      ),
    });
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const body = data !== undefined ? JSON.stringify(data) : null;
    const response = await fetchWithTimeout(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', ...getAuthHeaders() },
        options?.headers,
      ),
      body,
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const body = data !== undefined ? JSON.stringify(data) : null;
    const response = await fetchWithTimeout(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: 'PUT',
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', ...getAuthHeaders() },
        options?.headers,
      ),
      body,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const body = data !== undefined ? JSON.stringify(data) : null;
    const response = await fetchWithTimeout(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: 'PATCH',
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', ...getAuthHeaders() },
        options?.headers,
      ),
      body,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetchWithTimeout(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: 'DELETE',
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', ...getAuthHeaders() },
        options?.headers,
      ),
    });
    return handleResponse<T>(response);
  },
};
