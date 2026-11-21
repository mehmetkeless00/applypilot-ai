// Local review tool for LLM-drafted labels (see eval/LABELLING_GUIDE.md,
// "Process rules").
//
//   npm run review            then open http://127.0.0.1:4610
//   npm run review -- --port 4700
//
// Shows one pending pair at a time: listing on the left, CV on the right,
// the draft below. Selection bucket, language tags, listing quality and
// persona metadata are never sent to the page. Every decision is written
// to the labels CSV immediately (atomic write), so closing the tool loses
// nothing; on restart it resumes at the first pair whose reviewed_change is
// still blank. A session stops after 60 reviews; restart for the next one.
//
// Keys: Enter = accept draft · 0-3 = final label · l / h = confidence
// low / high · n = flag non_job · t = real job (clear flag) · / = note ·
// u = undo last save in this session.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCvs } from "./lib/cvs";
import { parseCsv, stringifyCsv } from "./lib/csv";
import { DATA_DIR, loadSnapshot } from "./lib/snapshot";

const SESSION_LIMIT = 60;
const LABEL_COLUMNS = [
  "pair_id", "cv_id", "job_id", "draft_label", "label", "reviewed_change",
  "confidence", "flag", "notes", "labelled_at",
];

interface LabelSet {
  name: "main" | "fulltext";
  file: string;
  rows: Record<string, string>[];
  jobs: Map<string, { title: string; company: string | null; description: string }>;
}

const sets: LabelSet[] = [
  { name: "main", file: "labels.csv", snapshot: "snapshot.jsonl" },
  { name: "fulltext", file: "labels-fulltext.csv", snapshot: "snapshot-fulltext.jsonl" },
].map(({ name, file, snapshot }) => ({
  name: name as LabelSet["name"],
  file: join(DATA_DIR, "labels", file),
  rows: parseCsv(readFileSync(join(DATA_DIR, "labels", file), "utf8")),
  jobs: loadSnapshot(snapshot) as LabelSet["jobs"],
}));
const cvs = new Map(loadCvs().map((cv) => [cv.meta.id, cv.text]));

// Draft rationale per pair, kept so a reviewer note is appended to the
// original rationale and undo can restore it exactly.
const undoStack: { set: LabelSet; index: number; before: Record<string, string> }[] = [];
let sessionCount = 0;

function save(set: LabelSet) {
  const tmp = `${set.file}.tmp`;
  writeFileSync(tmp, stringifyCsv(LABEL_COLUMNS, set.rows));
  renameSync(tmp, set.file);
}

function current(): { set: LabelSet; index: number } | null {
  for (const set of sets) {
    const index = set.rows.findIndex((r) => r.reviewed_change === "");
    if (index >= 0) return { set, index };
  }
  return null;
}

function progress() {
  return {
    sets: sets.map((s) => ({
      name: s.name,
      reviewed: s.rows.filter((r) => r.reviewed_change !== "").length,
      total: s.rows.length,
      changed: s.rows.filter((r) => r.reviewed_change === "yes").length,
    })),
    session: { count: sessionCount, limit: SESSION_LIMIT },
  };
}

function state() {
  const next = current();
  const base = { progress: progress(), canUndo: undoStack.length > 0 };
  if (sessionCount >= SESSION_LIMIT) return { ...base, status: "session_done" };
  if (!next) return { ...base, status: "all_done" };
  const row = next.set.rows[next.index];
  const job = next.set.jobs.get(row.job_id);
  return {
    ...base,
    status: "pending",
    pair: {
      set: next.set.name,
      pair_id: row.pair_id,
      listing: job
        ? { title: job.title, company: job.company, description: job.description }
        : { title: "(listing missing from local snapshot)", company: null, description: "" },
      cv: cvs.get(row.cv_id) ?? "(CV missing)",
      draft: {
        label: row.draft_label,
        confidence: row.confidence,
        flag: row.flag,
        notes: row.notes,
      },
    },
  };
}

function review(body: {
  pair_id?: string;
  label?: number | null;
  confidence?: string;
  flag?: string;
  note?: string;
}): string | null {
  if (sessionCount >= SESSION_LIMIT) return "Session limit reached; restart the tool.";
  const next = current();
  if (!next) return "Nothing left to review.";
  const row = next.set.rows[next.index];
  if (body.pair_id !== row.pair_id) return "Stale page: reload to see the current pair.";
  const label = body.label ?? null;
  if (label !== null && ![0, 1, 2, 3].includes(label)) return "Label must be 0-3.";
  if (body.confidence !== "low" && body.confidence !== "high") return "Confidence must be low or high.";
  if (body.flag !== "" && body.flag !== "non_job") return "Flag must be empty or non_job.";
  const note = (body.note ?? "").replace(/\s+/g, " ").trim();

  undoStack.push({ set: next.set, index: next.index, before: { ...row } });
  const finalLabel = label === null ? row.draft_label : String(label);
  row.label = finalLabel;
  row.reviewed_change = finalLabel === row.draft_label ? "no" : "yes";
  row.confidence = body.confidence;
  row.flag = body.flag;
  row.notes = note ? `${row.notes} | reviewer: ${note}` : row.notes;
  row.labelled_at = new Date().toISOString().slice(0, 10);
  save(next.set);
  sessionCount++;
  return null;
}

function undo(): string | null {
  const last = undoStack.pop();
  if (!last) return "Nothing to undo in this session.";
  last.set.rows[last.index] = last.before;
  save(last.set);
  sessionCount--;
  return null;
}

function send(res: ServerResponse, status: number, type: string, body: string) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Label review</title>
<style>
  :root { --bg:#f7f7f5; --panel:#fff; --text:#1d1d1b; --muted:#6b6b66; --line:#e2e1dc; --accent:#2f5d8a; --warn:#9a3b1b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#161615; --panel:#1f1f1d; --text:#ecebe6; --muted:#a3a29c; --line:#34332f; --accent:#7fb0de; --warn:#e7926f; } }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.5 system-ui, sans-serif; background:var(--bg); color:var(--text); height:100vh; display:flex; flex-direction:column; }
  header { padding:8px 16px; border-bottom:1px solid var(--line); display:flex; gap:24px; align-items:baseline; flex-wrap:wrap; }
  header b { font-size:16px; }
  .muted { color:var(--muted); }
  main { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px 16px; min-height:0; }
  section { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px 16px; overflow:auto; }
  section h2 { margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
  .title { font-weight:600; font-size:16px; margin-bottom:8px; }
  .text { white-space:pre-wrap; }
  footer { border-top:1px solid var(--line); padding:10px 16px; background:var(--panel); }
  .draft { display:flex; gap:16px; align-items:baseline; flex-wrap:wrap; }
  .big { font-size:28px; font-weight:700; color:var(--accent); }
  .controls { display:flex; gap:16px; align-items:center; margin-top:8px; flex-wrap:wrap; }
  .pill { border:1px solid var(--line); border-radius:999px; padding:2px 10px; }
  .pill.on { border-color:var(--accent); color:var(--accent); font-weight:600; }
  input { flex:1; min-width:240px; padding:6px 8px; border:1px solid var(--line); border-radius:6px; background:var(--bg); color:var(--text); font:inherit; }
  .msg { color:var(--warn); min-height:1.5em; }
  .keys { font-size:13px; }
  kbd { border:1px solid var(--line); border-bottom-width:2px; border-radius:4px; padding:0 5px; font-size:12px; }
  .center { grid-column:1 / -1; display:flex; align-items:center; justify-content:center; font-size:18px; }
  @media (max-width: 800px) { main { grid-template-columns:1fr; } }
</style></head>
<body>
<header><b id="pairId">…</b><span id="progress" class="muted"></span></header>
<main id="main">
  <section><h2>Listing</h2><div class="title" id="listingTitle"></div><div class="text" id="listingText"></div></section>
  <section><h2>CV</h2><div class="text" id="cvText"></div></section>
</main>
<footer>
  <div class="draft"><span class="muted">Draft</span><span class="big" id="draftLabel"></span>
    <span id="draftMeta" class="muted"></span><span id="draftNotes"></span></div>
  <div class="controls">
    <span>Confidence <span class="pill" id="confLow">low</span> <span class="pill" id="confHigh">high</span></span>
    <span>Listing <span class="pill" id="flagJob">real job</span> <span class="pill" id="flagNon">non_job</span></span>
    <input id="note" placeholder="Optional note (press / to type, Esc to leave)" maxlength="300">
  </div>
  <div class="msg" id="msg"></div>
  <div class="keys muted"><kbd>Enter</kbd> accept draft · <kbd>0</kbd>–<kbd>3</kbd> final label · <kbd>l</kbd>/<kbd>h</kbd> confidence ·
    <kbd>t</kbd> real job · <kbd>n</kbd> non_job · <kbd>/</kbd> note · <kbd>u</kbd> undo last</div>
</footer>
<script>
let pair = null, conf = "high", flag = "", busy = false;
const $ = (id) => document.getElementById(id);
function paint() {
  $("confLow").className = "pill" + (conf === "low" ? " on" : "");
  $("confHigh").className = "pill" + (conf === "high" ? " on" : "");
  $("flagJob").className = "pill" + (flag === "" ? " on" : "");
  $("flagNon").className = "pill" + (flag === "non_job" ? " on" : "");
}
function showProgress(p) {
  const parts = p.sets.map(s => s.name + " " + s.reviewed + "/" + s.total + " (changed " + s.changed + ")");
  $("progress").textContent = parts.join(" · ") + " · session " + p.session.count + "/" + p.session.limit;
}
async function load() {
  const r = await fetch("/api/state"); const s = await r.json();
  showProgress(s.progress);
  if (s.status !== "pending") {
    pair = null;
    $("pairId").textContent = s.status === "all_done" ? "All pairs reviewed" : "Session complete";
    $("main").innerHTML = "";
    const done = document.createElement("div"); done.className = "center";
    done.textContent = s.status === "all_done" ? "Every pair is reviewed. Nothing left to do."
      : "You reviewed " + s.progress.session.limit + " pairs. Stop the tool and start it again for the next session.";
    $("main").appendChild(done);
    return;
  }
  pair = s.pair;
  $("pairId").textContent = pair.pair_id + " · " + (pair.set === "main" ? "production set" : "full-text set");
  $("listingTitle").textContent = pair.listing.title + (pair.listing.company ? " · " + pair.listing.company : "");
  $("listingText").textContent = pair.listing.description;
  $("cvText").textContent = pair.cv;
  $("draftLabel").textContent = pair.draft.label;
  $("draftMeta").textContent = "confidence " + pair.draft.confidence + (pair.draft.flag ? " · " + pair.draft.flag : "");
  $("draftNotes").textContent = pair.draft.notes;
  conf = pair.draft.confidence === "low" ? "low" : "high";
  flag = pair.draft.flag === "non_job" ? "non_job" : "";
  $("note").value = ""; paint();
  document.querySelectorAll("section").forEach(el => el.scrollTop = 0);
}
async function post(path, body) {
  if (busy) return; busy = true;
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const out = await r.json();
    $("msg").textContent = out.error || out.info || "";
    await load();
  } finally { busy = false; }
}
function submit(label) {
  if (!pair) return;
  post("/api/review", { pair_id: pair.pair_id, label, confidence: conf, flag, note: $("note").value });
}
document.addEventListener("keydown", (e) => {
  if (e.target === $("note")) {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); $("note").blur(); }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Enter") { e.preventDefault(); submit(null); }
  else if (["0","1","2","3"].includes(e.key)) submit(Number(e.key));
  else if (e.key === "l") { conf = "low"; paint(); }
  else if (e.key === "h") { conf = "high"; paint(); }
  else if (e.key === "n") { flag = "non_job"; paint(); }
  else if (e.key === "t") { flag = ""; paint(); }
  else if (e.key === "/") { e.preventDefault(); $("note").focus(); }
  else if (e.key === "u") post("/api/undo");
});
load();
</script></body></html>`;

const portArg = process.argv.indexOf("--port");
const port = portArg > 0 ? Number(process.argv[portArg + 1]) : 4610;

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") return send(res, 200, "text/html; charset=utf-8", PAGE);
    if (req.method === "GET" && req.url === "/api/state") {
      return send(res, 200, "application/json", JSON.stringify(state()));
    }
    if (req.method === "POST" && req.url === "/api/review") {
      const error = review((await readJson(req)) as Parameters<typeof review>[0]);
      return send(res, error ? 409 : 200, "application/json", JSON.stringify(error ? { error } : { info: "Saved." }));
    }
    if (req.method === "POST" && req.url === "/api/undo") {
      const error = undo();
      return send(res, error ? 409 : 200, "application/json", JSON.stringify(error ? { error } : { info: "Undone." }));
    }
    send(res, 404, "text/plain", "Not found");
  } catch (error) {
    console.error(error);
    send(res, 500, "application/json", JSON.stringify({ error: "Server error; see terminal." }));
  }
}).listen(port, "127.0.0.1", () => {
  const p = progress();
  console.log(`Label review: http://127.0.0.1:${port}`);
  console.log(p.sets.map((s) => `${s.name} ${s.reviewed}/${s.total} reviewed`).join(" · "));
  console.log(`Session limit ${SESSION_LIMIT}. Press Ctrl+C to stop; progress is already saved.`);
});
