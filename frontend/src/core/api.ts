export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api2.nishonow.com";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ResponseType = "json" | "blob";

export interface ApiRequestOptions {
  path: string;
  method?: RequestMethod;
  token?: string;
  body?: BodyInit | Record<string, unknown>;
  isForm?: boolean;
  responseType?: ResponseType;
}

export class ApiRequestError extends Error {
  unauthorized: boolean;

  constructor(message: string, unauthorized = false) {
    super(message);
    this.name = "ApiRequestError";
    this.unauthorized = unauthorized;
  }
}

export async function apiRequest<T = unknown>(options: ApiRequestOptions): Promise<T> {
  const { path, method = "GET", token, body, isForm = false, responseType = "json" } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) {
      payload = body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  if (responseType === "blob") {
    if (!response.ok) {
      throw new ApiRequestError(`Request failed (${response.status})`, response.status === 401);
    }
    return (await response.blob()) as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = data?.detail || data?.message || `Request failed (${response.status})`;
    throw new ApiRequestError(message, response.status === 401);
  }

  return data as T;
}

