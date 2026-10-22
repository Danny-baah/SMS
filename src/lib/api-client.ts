export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export class ApiError extends Error {
  public status: number;
  public errors?: Array<{ field?: string; message: string }>;

  constructor(message: string, status = 400, errors?: Array<{ field?: string; message: string }>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("http") ? endpoint : endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json: ApiResponse<T> = await res.json().catch(() => ({
      success: false,
      message: `Failed to parse response (Status: ${res.status})`,
    }));

    if (!res.ok || !json.success) {
      throw new ApiError(
        json.message || "An unexpected error occurred",
        res.status,
        json.errors
      );
    }

    return json;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network error. Please check database and server status.", 500);
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }
    return request<T>(url, { method: "GET" });
  },

  post: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string) => {
    return request<T>(endpoint, { method: "DELETE" });
  },
};

export default api;
