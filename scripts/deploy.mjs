#!/usr/bin/env node
/**
 * One-shot Cloudflare deploy for Recall.
 *
 * Reads config from environment (or a local `.deploy.env` file) and:
 *   1. writes SUPABASE_URL into wrangler.toml [vars]
 *   2. pushes SUPABASE_SERVICE_KEY + ADMIN_SECRET as Worker secrets
 *   3. deploys the Worker
 *
 * No interactive browser login needed if CLOUDFLARE_API_TOKEN is set.
 * Create a token at: Cloudflare dashboard -> My Profile -> API Tokens ->
 * "Edit Cloudflare Workers" template (add Workers AI: Read if prompted).
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_SECRET
 *
 * Usage:  node scripts/deploy.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Load .deploy.env (KEY=VALUE lines) into process.env if present.
if (existsSync(".deploy.env")) {
  for (const line of readFileSync(".deploy.env", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const need = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "ADMIN_SECRET",
];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:\n  " + missing.join("\n  "));
  console.error("\nSet them in your shell or in a .deploy.env file (gitignored).");
  process.exit(1);
}

const wrangler = (args, input) =>
  execFileSync("npx", ["wrangler", ...args], {
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    input,
    shell: process.platform === "win32",
    env: process.env,
  });

// 1. Point wrangler.toml at the Supabase project URL.
const toml = readFileSync("wrangler.toml", "utf8").replace(
  /SUPABASE_URL\s*=\s*".*"/,
  `SUPABASE_URL = "${process.env.SUPABASE_URL}"`,
);
writeFileSync("wrangler.toml", toml);
console.log("✓ wrangler.toml SUPABASE_URL set");

// 2. Secrets.
console.log("→ setting secrets…");
wrangler(["secret", "put", "SUPABASE_SERVICE_KEY"], process.env.SUPABASE_SERVICE_KEY + "\n");
wrangler(["secret", "put", "ADMIN_SECRET"], process.env.ADMIN_SECRET + "\n");

// 3. Deploy.
console.log("→ deploying…");
wrangler(["deploy"]);
console.log("\n✓ Deployed. Next: create a space with scripts/create-space.mjs");
