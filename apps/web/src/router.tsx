import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { RootComponent } from "./routes/__root";
import { BotsComponent } from "./routes/bots";
import { IndexComponent } from "./routes/index";

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexComponent,
});

const botsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bots",
  component: BotsComponent,
});

const routeTree = rootRoute.addChildren([indexRoute, botsRoute]);

export function getRouter() {
  return createRouter({ routeTree });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
