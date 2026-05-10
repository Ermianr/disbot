import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { type Bot, createBot, getBots } from "../lib/api";

export function BotsComponent() {
  const [bots, setBots] = useState<Bot[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const refresh = useCallback(async () => {
    try {
      setBots(await getBots(apiUrl));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createBot(apiUrl, name);
      setName("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1>Bots</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={onSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bot name"
        />
        <button type="submit">Create</button>
      </form>
      {bots === null ? (
        <p>Loading…</p>
      ) : bots.length === 0 ? (
        <p>No bots yet.</p>
      ) : (
        <ul>
          {bots.map((bot) => (
            <li key={bot.id}>
              {bot.name} <small>({bot.createdAt})</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
