import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getMe } from "../lib/api";
import { forwardCookie } from "../lib/api.server";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getMeServer = createServerFn({ method: "GET" }).handler(async () => {
  return getMe(apiUrl, forwardCookie()).catch(() => null);
});

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const user = await getMeServer().catch(() => null);
    if (user) throw redirect({ to: "/bots" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}
