#!/usr/bin/env node
/**
 * dsh-purge-kit doctor — read-only self check.
 * Run after a restart: it reports whether the bundle patch self-registered
 * and whether the plugin reported a load.
 *
 *   purgekit-doctor
 *   node bin/doctor.mjs --home /root/.dsh --profile web
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PKG = "dsh-purge-kit";

function argsOf(argv) {
  const out = { home: "", profile: "web" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--home") out.home = argv[++i] || "";
    else if (a === "--profile") out.profile = argv[++i] || "web";
  }
  return out;
}

function findHome(explicit) {
  if (explicit) return explicit;
  const env = process.env.DSH_HOME;
  if (env && fs.existsSync(env)) return env;
  for (const c of [path.join(os.homedir(), ".dsh"), "/root/.dsh"]) {
    try { if (fs.existsSync(c)) return c; } catch { /* ignore */ }
  }
  return path.join(os.homedir(), ".dsh");
}

const opts = argsOf(process.argv);
const home = findHome(opts.home);
const profileDir = path.join(home, "profiles", opts.profile);
const rows = [];
const ok = (k, v) => rows.push(["OK", k, v]);
const bad = (k, v) => rows.push(["!!", k, v]);

ok("home", home);
ok("profile", profileDir);

const pkgDir = path.join(profileDir, "node_modules", PKG);
if (fs.existsSync(path.join(pkgDir, "index.js"))) ok("package", pkgDir); else bad("package", "missing " + pkgDir);

try {
  const j = JSON.parse(fs.readFileSync(path.join(profileDir, "package.json"), "utf8").replace(/^\uFEFF/, ""));
  const bundles = j?.dsh?.profile?.bundles || [];
  if (bundles.includes(PKG)) ok("bundles", bundles.join(", ")); else bad("bundles", "entry missing");
} catch (e) { bad("bundles", String(e.message || e)); }

try {
  const own = path.join(pkgDir, "cordis.patch.yml");
  const text = fs.readFileSync(own, "utf8");
  if (text.includes("id: " + PKG)) ok("self-register", "bundle patch inserts " + PKG);
  else bad("self-register", "bundle patch has no insert for " + PKG);
} catch { bad("self-register", "cordis.patch.yml unreadable"); }

try {
  const st = JSON.parse(fs.readFileSync(path.join(home, PKG, "state.json"), "utf8"));
  ok("loaded", "version " + st.version + " @ " + st.loadedAt);
  ok("bytes", String(st.injectedBytes));
  ok("hooks", JSON.stringify(st.hooks));
} catch {
  bad("loaded", "no state.json yet — restart the engine");
}

const width = Math.max(...rows.map((r) => r[1].length));
for (const [flag, k, v] of rows) console.log(" " + flag + "  " + k.padEnd(width) + "  " + v);
process.exit(rows.some((r) => r[0] === "!!") ? 1 : 0);
