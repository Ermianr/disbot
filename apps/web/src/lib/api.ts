export async function getHealth(apiUrl: string) {
  const res = await fetch(`${apiUrl}/health`);
  if (!res.ok) {
    throw new Error("Health check failed");
  }
  return res.json() as Promise<{ status: string }>;
}
