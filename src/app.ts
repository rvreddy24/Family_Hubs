export function dashboardPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Recall · dashboard</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    color:#e2e8f0; background:#0b1220; }
  header { display:flex; align-items:center; gap:12px; padding:14px 20px;
    border-bottom:1px solid #1c2942; background:#0d1526; position:sticky; top:0; z-index:5; }
  header .logo { font-weight:700; letter-spacing:-.01em; }
  header .logo b { color:#38bdf8; }
  header .sp { margin-left:auto; font-size:13px; color:#7f93ad; }
  main { max-width:820px; margin:0 auto; padding:24px 20px 80px; }
  .row { display:flex; gap:10px; flex-wrap:wrap; }
  input, textarea, button, select {
    font:inherit; color:#e6edf9; background:#0e1626; border:1px solid #24344f;
    border-radius:10px; padding:10px 12px; }
  input, textarea { width:100%; }
  textarea { resize:vertical; min-height:64px; }
  input::placeholder, textarea::placeholder { color:#5c6f8a; }
  button { cursor:pointer; background:#1656a0; border-color:#1e6bc4; color:#fff; font-weight:600;
    white-space:nowrap; }
  button:hover { background:#1a63b8; }
  button.ghost { background:transparent; color:#9fb3cf; border-color:#24344f; font-weight:500; }
  button.ghost:hover { background:#111c30; }
  button.danger { background:transparent; color:#f19a9a; border-color:#3a2530; }
  button.danger:hover { background:#2a1620; }
  .tabs { display:flex; gap:6px; margin:18px 0 14px; }
  .tabs button { background:transparent; border:none; color:#8ba0bd; padding:8px 14px;
    border-radius:8px; font-weight:600; }
  .tabs button.active { background:#12233c; color:#7dd3fc; }
  .card { background:#0e1626; border:1px solid #1c2942; border-radius:14px; padding:14px 16px;
    margin-bottom:12px; animation: fade .25s ease both; }
  @keyframes fade { from{opacity:0; transform:translateY(6px)} to{opacity:1} }
  .card .meta { display:flex; gap:10px; align-items:center; margin-top:10px; flex-wrap:wrap;
    font-size:12px; color:#6f84a1; }
  .tag { background:#10243f; color:#7dd3fc; border:1px solid #17304d; border-radius:999px;
    padding:2px 9px; font-size:12px; }
  .sim { color:#5fd0a8; font-weight:600; }
  .spacer { flex:1; }
  .muted { color:#6f84a1; }
  .gate { max-width:440px; margin:8vh auto; }
  .gate .card { padding:22px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .hide { display:none; }
  .err { color:#f6a9a9; font-size:13px; min-height:18px; margin-top:6px; }
  a { color:#7dd3fc; }
</style>
</head>
<body>
<header>
  <span class="logo">Re<b>call</b></span>
  <span class="sp" id="spaceLabel"></span>
  <button class="ghost" id="signout" style="padding:6px 10px" hidden>Sign out</button>
</header>

<!-- Gate: ask for API key -->
<div class="gate" id="gate">
  <div class="card">
    <h1>Open your memory space</h1>
    <p class="muted">Paste the space API key (<code>rcl_…</code>) you got from <code>POST /spaces</code>.</p>
    <div style="margin:14px 0 8px"><input id="keyInput" placeholder="rcl_…" autocomplete="off" /></div>
    <button id="connect" style="width:100%">Connect</button>
    <div class="err" id="gateErr"></div>
  </div>
</div>

<!-- App -->
<main id="app" class="hide">
  <div class="tabs">
    <button data-tab="search" class="active">Search</button>
    <button data-tab="recent">Recent</button>
    <button data-tab="add">Add</button>
  </div>

  <section id="tab-search">
    <div class="row">
      <input id="q" placeholder="Semantic search… e.g. 'which database did we choose?'" />
      <button id="searchBtn">Recall</button>
    </div>
    <div class="err" id="searchErr"></div>
    <div id="searchResults" style="margin-top:14px"></div>
  </section>

  <section id="tab-recent" class="hide">
    <div class="row"><span class="muted">Newest first</span><span class="spacer"></span>
      <button class="ghost" id="refreshRecent">Refresh</button></div>
    <div id="recentResults" style="margin-top:14px"></div>
  </section>

  <section id="tab-add" class="hide">
    <div class="card">
      <textarea id="newContent" placeholder="Something worth remembering…"></textarea>
      <div style="margin-top:10px"><input id="newTags" placeholder="tags, comma, separated (optional)" /></div>
      <div class="row" style="margin-top:10px"><span class="spacer"></span>
        <button id="addBtn">Remember it</button></div>
      <div class="err" id="addErr"></div>
    </div>
  </section>
</main>

<script>
const BASE = location.origin;
let KEY = localStorage.getItem("recall_key") || "";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const when = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type":"application/json", "Authorization":"Bearer "+KEY, ...(opts.headers||{}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || ("HTTP "+res.status));
  return body;
}

function card(m, showSim) {
  const tags = (m.tags||[]).map((t)=>'<span class="tag">'+esc(t)+'</span>').join(" ");
  const sim = showSim && typeof m.similarity==="number"
    ? '<span class="sim">'+Math.round(m.similarity*100)+'% match</span>' : "";
  return '<div class="card" data-id="'+m.id+'">'
    + '<div class="content" style="white-space:pre-wrap">'+esc(m.content)+'</div>'
    + '<div class="meta">'+tags+'<span class="spacer"></span>'+sim
    + '<span>'+when(m.created_at)+'</span>'
    + '<button class="ghost editBtn" style="padding:4px 10px">Edit</button>'
    + '<button class="danger delBtn" style="padding:4px 10px">Delete</button></div></div>';
}

function render(container, items, showSim) {
  if (!items.length) { container.innerHTML = '<p class="muted">Nothing here yet.</p>'; return; }
  container.innerHTML = items.map((m)=>card(m, showSim)).join("");
  container.querySelectorAll(".delBtn").forEach((b)=>b.onclick = onDelete);
  container.querySelectorAll(".editBtn").forEach((b)=>b.onclick = onEdit);
}

async function onDelete(e) {
  const el = e.target.closest(".card"); const id = el.dataset.id;
  if (!confirm("Delete this memory?")) return;
  try { await api("/memories/"+id, { method:"DELETE" }); el.remove(); }
  catch (err) { alert(err.message); }
}

function onEdit(e) {
  const el = e.target.closest(".card"); const id = el.dataset.id;
  const cur = el.querySelector(".content").textContent;
  el.querySelector(".content").innerHTML =
    '<textarea class="editArea">'+esc(cur)+'</textarea>'
    + '<div class="row" style="margin-top:8px"><span class="spacer"></span>'
    + '<button class="ghost cancelE" style="padding:4px 10px">Cancel</button>'
    + '<button class="saveE" style="padding:4px 10px">Save</button></div>';
  el.querySelector(".cancelE").onclick = () => { el.querySelector(".content").textContent = cur; };
  el.querySelector(".saveE").onclick = async () => {
    const content = el.querySelector(".editArea").value.trim();
    if (!content) return;
    try {
      const m = await api("/memories/"+id, { method:"PATCH", body: JSON.stringify({ content }) });
      el.querySelector(".content").textContent = m.content;
    } catch (err) { alert(err.message); }
  };
}

// Tabs
document.querySelectorAll(".tabs button").forEach((b)=>{
  b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach((x)=>x.classList.remove("active"));
    b.classList.add("active");
    ["search","recent","add"].forEach((t)=>$("#tab-"+t).classList.toggle("hide", t!==b.dataset.tab));
    if (b.dataset.tab==="recent") loadRecent();
  };
});

$("#searchBtn").onclick = doSearch;
$("#q").addEventListener("keydown", (e)=>{ if (e.key==="Enter") doSearch(); });
async function doSearch() {
  const query = $("#q").value.trim(); $("#searchErr").textContent = "";
  if (!query) return;
  try { const { results } = await api("/recall", { method:"POST", body: JSON.stringify({ query, limit:10 }) });
    render($("#searchResults"), results, true); }
  catch (err) { $("#searchErr").textContent = err.message; }
}

$("#refreshRecent").onclick = loadRecent;
async function loadRecent() {
  try { const { results } = await api("/recent?limit=25"); render($("#recentResults"), results, false); }
  catch (err) { $("#recentResults").innerHTML = '<p class="err">'+esc(err.message)+'</p>'; }
}

$("#addBtn").onclick = async () => {
  const content = $("#newContent").value.trim(); $("#addErr").textContent = "";
  if (!content) return;
  const tags = $("#newTags").value.split(",").map((t)=>t.trim()).filter(Boolean);
  try {
    await api("/remember", { method:"POST", body: JSON.stringify({ content, tags }) });
    $("#newContent").value = ""; $("#newTags").value = "";
    document.querySelector('[data-tab="recent"]').click();
  } catch (err) { $("#addErr").textContent = err.message; }
};

// Auth gate
$("#connect").onclick = connect;
$("#keyInput").addEventListener("keydown", (e)=>{ if (e.key==="Enter") connect(); });
async function connect() {
  const k = $("#keyInput").value.trim(); $("#gateErr").textContent = "";
  if (!k) return;
  await validateAndShow(k);
}
async function validateAndShow(k) {
  KEY = k;
  try {
    await api("/recent?limit=1");           // validates the key
    localStorage.setItem("recall_key", k);
    showApp();
  } catch (err) {
    KEY = ""; localStorage.removeItem("recall_key");
    $("#gateErr").textContent = err.message;
  }
}

$("#signout").onclick = () => { localStorage.removeItem("recall_key"); location.reload(); };

function showApp() {
  $("#gate").classList.add("hide");
  $("#app").classList.remove("hide");
  $("#signout").hidden = false;
  $("#spaceLabel").textContent = "connected";
  loadRecent();
  // default tab = search
  document.querySelector('[data-tab="search"]').click();
}

if (KEY) { validateAndShow(KEY); }
</script>
</body>
</html>`;
}
