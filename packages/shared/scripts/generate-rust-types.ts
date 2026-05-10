#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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
const outputPath = resolve(repoRoot, "crates", "shared", "src", "dsl.rs");

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
    outputPath,
  ],
  { cwd: repoRoot, stdio: "inherit" },
);
if (codegen.status !== 0) {
  process.exit(codegen.status ?? 1);
}

const fmt = spawnSync("rustfmt", ["--quiet", "--edition", "2021", outputPath], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (fmt.status !== 0) {
  process.exit(fmt.status ?? 1);
}

console.log(`Generated ${outputPath}`);
