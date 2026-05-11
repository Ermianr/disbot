import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { register } from "../lib/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

function RegisterComponent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = () => setError(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(apiUrl, { email, username, password });
      await router.navigate({ to: "/bots" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Create your account</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => {
              clearError();
              setEmail(e.target.value);
            }}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => {
              clearError();
              setUsername(e.target.value);
            }}
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_-]{3,32}"
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => {
              clearError();
              setPassword(e.target.value);
            }}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}

export const Route = createFileRoute("/_auth/register")({
  component: RegisterComponent,
});
