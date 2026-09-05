export function landingPage(origin: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Recall — long-term memory for AI agents</title>
<meta name="description" content="An open memory layer for AI agents. MCP server + REST API on Cloudflare Workers, backed by Supabase pgvector." />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font: 15px/1.6 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: #e2e8f0; background: #0b1220;
    background-image: radial-gradient(60rem 40rem at 80% -10%, #10243f 0%, transparent 60%),
                      radial-gradient(50rem 40rem at -10% 10%, #10203a 0%, transparent 55%);
  }
  main { max-width: 820px; margin: 0 auto; padding: 64px 24px 96px; }
  .badge { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:#7dd3fc;
    background:#0e2036; border:1px solid #17304d; padding:6px 12px; border-radius:999px; }
  h1 { font-size: 44px; line-height:1.1; margin: 22px 0 10px; letter-spacing:-0.02em; }
  h1 .grad { background: linear-gradient(90deg,#38bdf8,#818cf8); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .lede { font-size: 19px; color:#a9b7cc; max-width: 60ch; }
  h2 { margin: 40px 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing:0.08em; color:#7f93ad; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-top:14px; }
  .card { background:#0e1626; border:1px solid #1c2942; border-radius:14px; padding:16px 18px; }
  .card h3 { margin:0 0 4px; font-size:15px; color:#e8eefb; }
  .card p { margin:0; color:#93a4bd; font-size:14px; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre { background:#0a1120; border:1px solid #1c2942; border-radius:12px; padding:16px; overflow:auto; font-size:13px; color:#cdd9ec; }
  .inline { background:#0a1120; border:1px solid #1c2942; border-radius:6px; padding:1px 6px; font-size:13px; color:#9fd2ff; }
  a { color:#7dd3fc; }
  footer { margin-top:56px; color:#64748b; font-size:13px; border-top:1px solid #1c2942; padding-top:20px; }
  .endpoints div { display:flex; gap:10px; padding:8px 0; border-bottom:1px solid #14203550; }
  .m { display:inline-block; min-width:52px; font-weight:600; font-size:12px; color:#7dd3fc; }
</style>
</head>
<body>
<main>
  <span class="badge">● live · Cloudflare Workers + Supabase</span>
  <h1>Give your agent a <span class="grad">memory</span>.</h1>
  <p class="lede">Recall is an open long-term memory layer for AI agents. Store facts, decisions and
  context in one session; semantically recall them in the next. Runs entirely on free tiers.</p>

  <p style="margin-top:18px"><a href="/app" style="display:inline-block; background:#1656a0; color:#fff; text-decoration:none; padding:10px 18px; border-radius:10px; font-weight:600;">Open the dashboard →</a></p>

  <div class="grid">
    <div class="card"><h3>remember</h3><p>Persist a fact, preference, or decision.</p></div>
    <div class="card"><h3>recall</h3><p>Semantic vector search over everything stored.</p></div>
    <div class="card"><h3>list_recent</h3><p>The newest memories, freshest first.</p></div>
    <div class="card"><h3>forget</h3><p>Delete a memory by id.</p></div>
  </div>

  <h2>Connect over MCP</h2>
  <p>Add this as a custom MCP connector (Streamable HTTP). Any MCP-capable agent gains the four tools above.</p>
  <pre>{
  "mcpServers": {
    "recall": {
      "url": "${origin}/mcp",
      "headers": { "Authorization": "Bearer YOUR_SPACE_KEY" }
    }
  }
}</pre>

  <h2>Or use the REST API</h2>
  <pre># create a space (needs the admin secret) -> returns your API key once
curl -X POST ${origin}/spaces \\
  -H "Authorization: Bearer ADMIN_SECRET" \\
  -d '{"name":"my-agent"}'

# remember something
curl -X POST ${origin}/remember \\
  -H "Authorization: Bearer YOUR_SPACE_KEY" \\
  -d '{"content":"The API rate limit is 100 req/day","tags":["ops"]}'

# recall it later
curl -X POST ${origin}/recall \\
  -H "Authorization: Bearer YOUR_SPACE_KEY" \\
  -d '{"query":"what is the rate limit?"}'</pre>

  <h2>Endpoints</h2>
  <div class="endpoints">
    <div><span class="m">POST</span> <code>/mcp</code> — MCP Streamable HTTP (space key)</div>
    <div><span class="m">POST</span> <code>/spaces</code> — create a memory space (admin secret)</div>
    <div><span class="m">POST</span> <code>/remember</code> — store a memory (space key)</div>
    <div><span class="m">POST</span> <code>/recall</code> — semantic search (space key)</div>
    <div><span class="m">GET</span> <code>/recent</code> — recent memories, optional ?tag= (space key)</div>
    <div><span class="m">GET</span> <code>/stats</code> — memory count for the space (space key)</div>
    <div><span class="m">PATCH</span> <code>/memories/:id</code> — edit a memory (space key)</div>
    <div><span class="m">DELETE</span> <code>/memories/:id</code> — forget (space key)</div>
    <div><span class="m">GET</span> <code>/app</code> — web dashboard</div>
    <div><span class="m">GET</span> <code>/health</code> — status</div>
  </div>

  <footer>Recall · your data is isolated per space and never leaves your Supabase project.
  Embeddings by Cloudflare Workers AI. <a href="https://modelcontextprotocol.io">MCP</a>.</footer>
</main>
</body>
</html>`;
}
