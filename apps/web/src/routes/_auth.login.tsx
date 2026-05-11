import {
  createFileRoute,
  Link,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { z } from "zod";
import { login } from "../lib/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const LoginSearch = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/, { message: "redirect must be a relative path" })
    .default("/bots"),
});

function LoginComponent() {
  const router = useRouter();
  const search = useSearch({ from: "/_auth/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(apiUrl, { email, password });
      await router.navigate({ to: search.redirect });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Log in</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}

export const Route = createFileRoute("/_auth/login")({
  component: LoginComponent,
  validateSearch: LoginSearch,
});
