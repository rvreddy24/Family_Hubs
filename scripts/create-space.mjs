#!/usr/bin/env node
/**
 * Mint a memory space and print its one-time API key.
 *
 * Usage:
 *   node scripts/create-space.mjs <worker-url> <admin-secret> [name]
 * Example:
 *   node scripts/create-space.mjs https://recall.you.workers.dev s3cr3t my-agent
 */
const [, , url, admin, name = "default"] = process.argv;
if (!url || !admin) {
  console.error("Usage: node scripts/create-space.mjs <worker-url> <admin-secret> [name]");
  process.exit(1);
}

const res = await fetch(url.replace(/\/+$/, "") + "/spaces", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin}` },
  body: JSON.stringify({ name }),
});
const body = await res.json();
if (!res.ok) {
  console.error("Failed:", body.error || res.status);
  process.exit(1);
}
console.log("\n✓ Space created\n");
console.log("  space_id:", body.space_id);
console.log("  api_key :", body.api_key, "  <-- save this now, shown once");
console.log("\nUse it as:  Authorization: Bearer " + body.api_key);
console.log("Dashboard:  " + url.replace(/\/+$/, "") + "/app\n");
