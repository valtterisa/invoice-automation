export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export type ApiSuccessBody<T> = {
  data: T;
  meta?: unknown;
};

export class ApiError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly status: number;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.requestId = body.requestId;
  }
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as ApiErrorBody;
    if (data?.error?.message) {
      return new ApiError(response.status, data.error);
    }
  } catch {
    /* fall through */
  }
  return new ApiError(response.status, {
    code: "unknown_error",
    message: response.statusText || "Request failed",
  });
}

export function unwrapData<T>(payload: unknown): T {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as ApiSuccessBody<T>).data;
  }
  return payload as T;
}

function resolveUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveUrl(path), { ...init, headers });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return unwrapData<T>(await response.json());
  }

  return undefined as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  post: <T>(path: string, body?: unknown, options?: { idempotencyKey?: string }) => {
    const headers = new Headers();
    if (options?.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    return request<T>(path, {
      method: "POST",
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: "POST",
      body: formData,
    }),
};
