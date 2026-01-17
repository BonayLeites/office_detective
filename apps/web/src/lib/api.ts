const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://127.0.0.1:8000';

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

export const api = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'GET',
      headers: mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
    });
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const body = data !== undefined ? JSON.stringify(data) : null;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
      body,
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const body = data !== undefined ? JSON.stringify(data) : null;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'PUT',
      headers: mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
      body,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'DELETE',
      headers: mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers),
    });
    return handleResponse<T>(response);
  },
};
