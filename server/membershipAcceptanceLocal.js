"use strict";
const http = require("node:http");
const { runMembershipAcceptance } = require("./membershipAcceptance");

// Local-only diagnostic service. Never bind this server to a public interface.
const host = "127.0.0.1";
const server = http.createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'" });
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Membership Acceptance</title><style>body{font:16px system-ui;background:#101d30;color:#fff;max-width:780px;margin:40px auto;padding:20px}button{background:#8fe4cb;color:#102132;border:0;border-radius:10px;padding:14px 22px;font-weight:700;cursor:pointer}li{margin:10px 0}small{color:#d2dfeb}</style><h1>Genius Learning Membership Test</h1><p>This diagnostic runs synthetic security checks only. No charges, accounts, or database changes.</p><form method="post" action="/run"><button type="submit">Run Membership Flow Test</button></form><p><small>For actual Stripe test-mode and production checks, configure the integration separately.</small></p></html>`);
    return;
  }
  if (req.method === "POST" && req.url === "/run") {
    const result = runMembershipAcceptance();
    res.writeHead(result.failed ? 422 : 200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result, null, 2));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
});
if (require.main === module) {
  server.listen(0, host, () => console.log("Membership diagnostic: http://" + host + ":" + server.address().port));
}
module.exports = { server };
