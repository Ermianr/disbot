import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

type ComposeService = {
  image?: string;
  build?: unknown;
  ports?: string[];
  expose?: (string | number)[];
  volumes?: string[];
  environment?: Record<string, string> | string[];
  depends_on?: Record<string, { condition: string }> | string[];
  healthcheck?: { test: string[] | string };
};

type ComposeFile = {
  services: Record<string, ComposeService>;
  volumes?: Record<string, unknown>;
};

const REPO_ROOT = resolve(__dirname, "..");

const loadCompose = (file: string): ComposeFile =>
  yaml.load(readFileSync(resolve(REPO_ROOT, file), "utf8")) as ComposeFile;

const parseEnvExampleKeys = (text: string): Set<string> => {
  const keys = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq > 0) keys.add(line.slice(0, eq).trim());
  }
  return keys;
};

const collectEnvVarReferences = (raw: string): Set<string> => {
  const refs = new Set<string>();
  // Matches ${VAR}, ${VAR:-default}, ${VAR-default}, ${VAR:?err}
  const pattern = /\$\{([A-Z_][A-Z0-9_]*)(?:[:?-][^}]*)?\}/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = pattern.exec(raw)) !== null) refs.add(match[1]);
  return refs;
};

describe("docker-compose.yml (production)", () => {
  const compose = loadCompose("docker-compose.yml");

  it("declares all production services", () => {
    expect(Object.keys(compose.services).sort()).toEqual(
      ["api", "nats", "orchestrator", "postgres", "redis", "web"].sort(),
    );
  });

  it.each([
    { service: "postgres", containerPath: "/var/lib/postgresql/data" },
    { service: "redis", containerPath: "/data" },
  ])("$service stores data in a named volume so it survives container restarts", ({
    service,
    containerPath,
  }) => {
    const svc = compose.services[service];
    const mounts = svc.volumes ?? [];
    const dataMount = mounts.find((m) => m.endsWith(`:${containerPath}`));
    if (!dataMount)
      throw new Error(`${service} must mount a volume at ${containerPath}`);

    const namedVolume = dataMount.split(":")[0];
    expect(
      namedVolume.startsWith("/") || namedVolume.startsWith("."),
      `${service} must use a NAMED volume (got bind mount: ${namedVolume})`,
    ).toBe(false);
    expect(
      compose.volumes?.[namedVolume],
      `${service} references "${namedVolume}" — must be declared under top-level volumes:`,
    ).toBeDefined();
  });

  it.each([
    {
      service: "api",
      deps: {
        postgres: "service_healthy",
        redis: "service_healthy",
        nats: "service_healthy",
      },
    },
    { service: "orchestrator", deps: { nats: "service_healthy" } },
    { service: "web", deps: { api: "service_healthy" } },
  ])("$service waits for its dependencies before starting", ({
    service,
    deps,
  }) => {
    const dependsOn = compose.services[service].depends_on;
    expect(dependsOn, `${service} must declare depends_on`).toBeDefined();
    expect(
      Array.isArray(dependsOn),
      `${service}.depends_on must use long form so it can express health conditions`,
    ).toBe(false);
    for (const [dep, condition] of Object.entries(deps)) {
      expect(
        (dependsOn as Record<string, { condition: string }>)[dep],
        `${service} must depend on ${dep}`,
      ).toBeDefined();
      expect(
        (dependsOn as Record<string, { condition: string }>)[dep].condition,
      ).toBe(condition);
    }
  });

  it.each([
    "postgres",
    "redis",
    "nats",
    "api",
    "web",
  ])("%s declares a healthcheck so dependents can wait on it", (service) => {
    expect(
      compose.services[service].healthcheck,
      `${service} needs a healthcheck`,
    ).toBeDefined();
  });

  it.each([
    { service: "api", dockerfile: "apps/api/Dockerfile" },
    { service: "web", dockerfile: "apps/web/Dockerfile" },
    { service: "orchestrator", dockerfile: "apps/orchestrator/Dockerfile" },
  ])("$service builds from $dockerfile", ({ service, dockerfile }) => {
    const build = compose.services[service].build as
      | { context?: string; dockerfile?: string }
      | string
      | undefined;
    expect(build, `${service} must have a build directive`).toBeDefined();
    const dockerfilePath =
      typeof build === "string"
        ? `${build}/Dockerfile`
        : `${build?.context ?? "."}/${build?.dockerfile ?? "Dockerfile"}`;
    expect(dockerfilePath.replace(/^\.\//, "").replace(/\\/g, "/")).toBe(
      dockerfile,
    );
  });

  it("api receives a DATABASE_URL targeting the postgres service (not localhost)", () => {
    const env = compose.services.api.environment as
      | Record<string, string>
      | undefined;
    if (!env) throw new Error("api must declare an environment block");
    const databaseUrl = env.DATABASE_URL;
    expect(
      databaseUrl,
      "api needs DATABASE_URL inside the docker network",
    ).toBeDefined();
    expect(databaseUrl).toMatch(/@postgres:/);
    expect(databaseUrl).not.toMatch(/@localhost/);
  });

  it("documents every env var it references in .env.example", () => {
    const composeRaw = readFileSync(
      resolve(REPO_ROOT, "docker-compose.yml"),
      "utf8",
    );
    const envExampleRaw = readFileSync(
      resolve(REPO_ROOT, ".env.example"),
      "utf8",
    );

    const referenced = collectEnvVarReferences(composeRaw);
    const documented = parseEnvExampleKeys(envExampleRaw);

    const missing = [...referenced].filter((v) => !documented.has(v)).sort();
    expect(
      missing,
      `compose references env vars not in .env.example: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("orchestrator mounts the host Docker socket so it can spawn Runtime containers", () => {
    const orchestrator = compose.services.orchestrator;
    const mounts = orchestrator.volumes ?? [];
    const socketMount = mounts.find((m) => m.includes("/var/run/docker.sock"));
    expect(
      socketMount,
      "orchestrator must mount /var/run/docker.sock",
    ).toBeDefined();
  });

  it.each([
    "api",
    "web",
  ])("%s uses expose (not ports) so Dokploy controls public routing", (service) => {
    const svc = compose.services[service];
    expect(svc.expose, `${service} must declare expose`).toBeDefined();
    expect(
      svc.expose?.length,
      `${service} must expose at least one port`,
    ).toBeGreaterThan(0);
    expect(
      svc.ports,
      `${service} must NOT declare ports (Dokploy handles routing)`,
    ).toBeUndefined();
  });
});
