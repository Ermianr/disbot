import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { getMe, logout, type PublicUser } from "../lib/api";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setUser(await getMe(apiUrl).catch(() => null));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onLogout() {
    await logout(apiUrl).catch(() => undefined);
    setUser(null);
    await router.navigate({ to: "/login" });
  }

  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        {user && <Link to="/bots">Bots</Link>}
      </nav>
      <div>
        {loading ? null : user ? (
          <>
            <span data-testid="current-username">{user.username}</span>
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
