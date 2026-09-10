export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; csrfToken?: string } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.csrfToken ? { "X-CSRF-Token": options.csrfToken } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "Request failed. Please try again.",
    );
  return result as T;
}
