export type Bot = {
  id: string;
  name: string;
  createdAt: string;
};

export async function getHealth(apiUrl: string) {
  const res = await fetch(`${apiUrl}/health`);
  if (!res.ok) {
    throw new Error("Health check failed");
  }
  return res.json() as Promise<{ status: string }>;
}

export async function getBots(apiUrl: string): Promise<Bot[]> {
  const res = await fetch(`${apiUrl}/bots`);
  if (!res.ok) {
    throw new Error("Failed to fetch bots");
  }
  return res.json() as Promise<Bot[]>;
}

export async function createBot(apiUrl: string, name: string): Promise<Bot> {
  const res = await fetch(`${apiUrl}/bots`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error("Failed to create bot");
  }
  return res.json() as Promise<Bot>;
}
