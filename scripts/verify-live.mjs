#!/usr/bin/env node
/**
 * verify-live.mjs — the six V-1 gates, from a GitHub-hosted runner.
 * Modes:  smoke  → pre-merge: OLD contract only, NEW fields are NOTES not asserts.
 *         full   → post-merge: NEW contract asserted (real POSTs, real 429).
 *         both   → smoke then full. Default mode by event:
 *                  pull_request → smoke | push → main | workflow_dispatch → both.
 * Env: GITHUB_EVENT, DISPATCH_MODE, STATUS_URL_OVERRIDE  (all optional)
 * Zero deps. Zero secrets. 429 is an ASSERTED EXPECTED outcome (rate-limit proof).
 *
 * Route notes (must match the live app, not nicknames):
 *   chat  = POST /api/chat  (SSE — never r.json())
 *   image = POST /api/image
 *   intel = POST /api/conversation-intel  (limit 10/min; limiter runs before Zod/LLM)
 * Burst body is intentionally invalid so the first 10 return 400 (no LLM) and the
 * 11th proves 429. Header X-RateLimit-Source is optional on intel (status.rateLimit
 * is the Neon witness after F).
 */
import { appendFileSync } from "node:fs";

const ev = process.env.GITHUB_EVENT || "";
const BASE = (process.env.STATUS_URL_OVERRIDE || "https://new-pro-kohl.vercel.app").replace(/\/+$/, "");
const mode =
  process.env.DISPATCH_MODE || (ev === "pull_request" ? "smoke" : ev === "push" ? "full" : "both");
const API_TIMEOUT = 10_000;
const BURST_TIMEOUT = 2_500;

const results = [];
const gate = (name, ok, note = "") => {
  results.push({ name, ok, note });
};

const get = (p, t = API_TIMEOUT) => fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(t) });
const post = (p, body, t = API_TIMEOUT) =>
  fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(t),
  });

const SMOKE_NOTES = /:github|:image|rateLimit-neon|models:github/;

// ---- Gate 1: status reachable + providers visible ----
let status = null;
try {
  const r = await get("/api/status");
  status = await r.json();
  gate("status:reachable", r.ok, `HTTP ${r.status}`);
} catch (e) {
  gate("status:reachable", false, String(e));
}

if (status) {
  // ---- Gate 2: provider status ----
  const has = (p) => Object.prototype.hasOwnProperty.call(status, p);
  const withField = [status.groq, status.gemini, status.huggingface, status.search].every(
    (v) => v === true,
  );
  gate("providers:legacy", withField, "groq/gemini/huggingface/search all true");
  gate(
    "providers:github",
    has("github") && status.github === true,
    has("github") ? `github=${status.github}` : "field ABSENT (pre-D contract)",
  );
  gate("status:image", has("image"), has("image") ? `image=${status.image}` : "field ABSENT (pre-E contract)");

  // ---- Gate 3: rateLimit reporting ----
  const rlOk = status.rateLimit === "neon";
  gate(
    "status:rateLimit-neon",
    rlOk,
    has("rateLimit") ? `rateLimit=${status.rateLimit}` : "field ABSENT (pre-F contract)",
  );

  // ---- Gate 4: models endpoint lists github ----
  let models = null;
  try {
    const r = await get("/api/models");
    models = await r.json();
  } catch {
    /* handled */
  }
  if (models) {
    const names = (Array.isArray(models) ? models : (models.models ?? models.providers ?? [])).map((m) =>
      typeof m === "string" ? m : (m.id ?? m.name ?? ""),
    );
    gate("models:github-listed", names.some((n) => /github/i.test(String(n))), `[${names.join(", ")}]`);
  } else {
    gate("models:github-listed", false, "endpoint unreachable");
  }
} else {
  for (const g of [
    "providers:legacy",
    "providers:github",
    "status:image",
    "status:rateLimit-neon",
    "models:github-listed",
  ])
    gate(g, false, "skipped: status unreachable");
}

// ---- Live POSTs (full only — smoke never POSTs) ----
if (mode === "full" || mode === "both") {
  // Gate 5: chat (SSE stream — parse text, not JSON)
  try {
    const r = await post("/api/chat", { messages: [{ role: "user", content: "قل: نواة تعمل" }] }, 20_000);
    const text = await r.text();
    const used = (text.match(/"provider":"([^"]+)"/) || [])[1] || "";
    const errMatch = text.match(/"error":"([^"]{0,80})/);
    gate(
      "chat:post-200",
      r.ok && !!used && !errMatch,
      r.ok ? `HTTP ${r.status} provider=${used || "?"}` : `HTTP ${r.status} ${text.slice(0, 120)}`,
    );
  } catch (e) {
    gate("chat:post-200", false, String(e));
  }

  // Gate 6a: image (proves E + flag=1)
  try {
    const r = await post("/api/image", { prompt: "a glowing green ai core, minimalist" }, 30_000);
    const j = await r.json().catch(() => ({}));
    if (r.status === 503 && /IMAGE_DISABLED/i.test(j?.code ?? j?.error ?? "")) {
      gate("image:generate-url", false, "503 IMAGE_DISABLED — flag not on Production");
    } else {
      gate(
        "image:generate-url",
        r.ok && typeof j?.url === "string" && j.url.length > 8,
        r.ok ? `source=${j?.source ?? "?"}` : `HTTP ${r.status}`,
      );
    }
  } catch (e) {
    gate("image:generate-url", false, String(e));
  }

  // Gate 6b: distributed limiter → expect 429
  // Invalid body: limiter runs first; 400 for counts ≤10 (no LLM); 429 on overflow.
  const burst = Array.from({ length: 11 }, () =>
    post("/api/conversation-intel", { q: "نواة" }, BURST_TIMEOUT).then(
      (r) => ({ code: r.status, src: r.headers.get("x-ratelimit-source") }),
      () => ({ code: 0, src: null }),
    ),
  );
  const codes = await Promise.all(burst);
  const hit = codes.filter((c) => c.code === 429);
  const srcHit = hit.some((c) => (c.src ?? "").toLowerCase().includes("neon"));
  const neonReported = status?.rateLimit === "neon";
  gate(
    "ratelimit:429-distributed",
    hit.length >= 1 && (srcHit || neonReported),
    `429×${hit.length}/11, x-ratelimit-source=${hit[0]?.src ?? "absent"}, status.rateLimit=${status?.rateLimit ?? "?"}`,
  );
}

// ---- Evidence summary (job summary + exit) ----
const sPart = results.filter((r) => r.ok);
const lines = [
  `## Verify Live — mode \`${mode}\`, base \`${BASE}\``,
  ...results.map((r) => {
    const mark = r.ok ? "✅" : mode === "smoke" && SMOKE_NOTES.test(r.name) ? "🟡 note" : "❌";
    return `${mark} \`${r.name}\`${r.note ? ` — ${r.note}` : ""}`;
  }),
  "",
  `**Gates ${sPart.length}/${results.length}** (🟡 = pre-merge: field not yet expected)`,
  "Politeness cap: 1 chat POST, 1 image POST, 11 cheap intel bursts (invalid body), all timeout-guarded.",
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  } catch {
    /* local run: summary is console-only */
  }
}

// Smoke: notes (🟡) are not failures. Full: any ❌ fails the gate.
const failed = results.some((r) => !r.ok && !(mode === "smoke" && SMOKE_NOTES.test(r.name)));
process.exit(failed ? 1 : 0);
