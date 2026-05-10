#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { BotConfig } from "../src/dsl";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");

const schemaPath = resolve(
  repoRoot,
  "target",
  "codegen",
  "bot-config.schema.json",
);
const candidatePath = resolve(
  repoRoot,
  "target",
  "codegen",
  "dsl.candidate.rs",
);
const committedPath = resolve(repoRoot, "crates", "shared", "src", "dsl.rs");

const jsonSchema = z.toJSONSchema(BotConfig, {
  io: "input",
  target: "draft-7",
});

mkdirSync(dirname(schemaPath), { recursive: true });
writeFileSync(schemaPath, `${JSON.stringify(jsonSchema, null, 2)}\n`);

const codegen = spawnSync(
  "cargo",
  [
    "run",
    "--quiet",
    "-p",
    "disbot-codegen",
    "--",
    "--input",
    schemaPath,
    "--output",
    candidatePath,
  ],
  { cwd: repoRoot, stdio: "inherit" },
);
if (codegen.status !== 0) {
  process.exit(codegen.status ?? 1);
}

const fmt = spawnSync(
  "rustfmt",
  ["--quiet", "--edition", "2021", candidatePath],
  { cwd: repoRoot, stdio: "inherit" },
);
if (fmt.status !== 0) {
  console.error("rustfmt failed on candidate output");
  process.exit(fmt.status ?? 1);
}

const candidate = readFileSync(candidatePath, "utf8");
const committed = readFileSync(committedPath, "utf8");

if (candidate !== committed) {
  console.error(
    `Generated Rust DSL types are out of sync with the Zod schemas.\n` +
      `Run \`bun run --filter '@disbot/shared' generate:rust-types\` and commit the result.\n` +
      `Expected (committed): ${committedPath}\n` +
      `Got (regenerated):    ${candidatePath}`,
  );
  process.exit(1);
}

console.log("Rust DSL types are in sync with Zod schemas.");
