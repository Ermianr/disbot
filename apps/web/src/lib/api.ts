export type Bot = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

export type ApiOptions = {
  cookie?: string;
};

async function apiFetch(
  apiUrl: string,
  path: string,
  init: RequestInit & ApiOptions = {},
): Promise<Response> {
  const { cookie, headers: headersInit, ...rest } = init;
  const headers = new Headers(headersInit);
  if (cookie) headers.set("cookie", cookie);
  return fetch(`${apiUrl}${path}`, {
    ...rest,
    credentials: "include",
    headers,
  });
}

export async function getHealth(apiUrl: string, opts?: ApiOptions) {
  const res = await apiFetch(apiUrl, "/health", opts);
  if (!res.ok) throw new Error("Health check failed");
  return res.json() as Promise<{ status: string }>;
}

export async function getBots(
  apiUrl: string,
  opts?: ApiOptions,
): Promise<Bot[]> {
  const res = await apiFetch(apiUrl, "/bots", opts);
  if (!res.ok) throw new Error("Failed to fetch bots");
  return res.json() as Promise<Bot[]>;
}

export async function createBot(
  apiUrl: string,
  name: string,
  opts?: ApiOptions,
): Promise<Bot> {
  const res = await apiFetch(apiUrl, "/bots", {
    ...opts,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create bot");
  return res.json() as Promise<Bot>;
}

export async function getMe(
  apiUrl: string,
  opts?: ApiOptions,
): Promise<PublicUser | null> {
  const res = await apiFetch(apiUrl, "/auth/me", opts);
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch current user");
  const body = (await res.json()) as { user: PublicUser };
  return body.user;
}

export async function login(
  apiUrl: string,
  body: { email: string; password: string },
  opts?: ApiOptions,
): Promise<PublicUser> {
  const res = await apiFetch(apiUrl, "/auth/login", {
    ...opts,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("Invalid credentials");
  if (!res.ok) throw new Error("Failed to log in");
  const parsed = (await res.json()) as { user: PublicUser };
  return parsed.user;
}

export async function register(
  apiUrl: string,
  body: { email: string; username: string; password: string },
  opts?: ApiOptions,
): Promise<PublicUser> {
  const res = await apiFetch(apiUrl, "/auth/register", {
    ...opts,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    const conflict = (await res.json().catch(() => null)) as {
      field?: string;
    } | null;
    const field = conflict?.field ?? "field";
    throw new Error(`That ${field} is already taken`);
  }
  if (!res.ok) throw new Error("Failed to register");
  const parsed = (await res.json()) as { user: PublicUser };
  return parsed.user;
}

export async function logout(apiUrl: string, opts?: ApiOptions): Promise<void> {
  const res = await apiFetch(apiUrl, "/auth/logout", {
    ...opts,
    method: "POST",
  });
  if (!res.ok && res.status !== 401) {
    throw new Error("Failed to log out");
  }
}
