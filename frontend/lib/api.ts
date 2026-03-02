import { getSession } from "next-auth/react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession() as any;
  const token = session?.backendToken;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export const api = {
  interviews: {
    list:       (params = "") => request<any>(`/interviews${params}`),
    get:        (id: string) => request<any>(`/interviews/${id}`),
    update:     (id: string, body: any) =>
      request<any>(`/interviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete:     (id: string) =>
      request<any>(`/interviews/${id}`, { method: "DELETE" }),
    transcribe: (id: string) =>
      request<any>(`/interviews/${id}/transcribe`, { method: "POST" }),
    analyse:    (id: string) =>
      request<any>(`/interviews/${id}/analyse`, { method: "POST" }),
    status:     (id: string) => request<any>(`/interviews/${id}/status`),
    metrics:    ()            => request<any>(`/interviews/metrics`),
    exportUrl:  (id: string, format: string) =>
      `${BASE}/api/v1/interviews/${id}/export?format=${format}`,
  },
  templates: {
    list:   ()                => request<any>(`/templates`),
    create: (body: any)       =>
      request<any>(`/templates`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      request<any>(`/templates/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string)      =>
      request<any>(`/templates/${id}`, { method: "DELETE" }),
  },
};

