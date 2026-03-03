/**
 * api.js — Lightweight HTTP API server (zero external dependencies).
 *
 * POST /
 * Content-Type: application/json
 *
 * Body:
 *   {
 *     "url":    <string>  — required, site to audit
 *     "pages":  <number>  — max pages to crawl & show in breakdown (default 6)
 *     "images": <number>  — max screenshot placeholders in UI/UX section (default 4)
 *     "full":   <boolean> — include page breakdown / forms / ui-ux sections (default true)
 *   }
 *
 * Response: text/html — the generated report HTML
 */

'use strict';

const http = require('http');
const { runAudit } = require('./auditor');
const { buildReport } = require('./reporter');
const { initCoverImage } = require('./generators/pages');
const { buildReportHTML } = require('./generators/reportBuilder');

const PORT = process.env.PORT || 3000;

// ── Helpers ────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendHTML(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

// ── Request handler ────────────────────────────────────────────────────────

async function handle(req, res) {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  // Parse body
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch {
    return sendJSON(res, 400, { error: 'Invalid JSON body.' });
  }

  // Validate + defaults
  const { url, pages = 6, images = 4, full = true } = body;

  if (!url || typeof url !== 'string') {
    return sendJSON(res, 400, { error: '"url" is required and must be a string.' });
  }

  try {
    new URL(url);
  } catch {
    return sendJSON(res, 400, { error: '"url" is not a valid URL.' });
  }

  const maxPages = Math.max(1, parseInt(pages, 10) || 6);
  const maxImages = Math.max(1, parseInt(images, 10) || 4);
  const includePageBreakdown = full !== false;

  console.log(`\n[API] ${new Date().toISOString()}`);
  console.log(`  url    : ${url}`);
  console.log(`  pages  : ${maxPages}`);
  console.log(`  images : ${maxImages}`);
  console.log(`  full   : ${includePageBreakdown}`);

  try {
    // 1. Crawl + audit — always uses full crawl limit (25 pages by default)
    const results = await runAudit(url);

    // 2. Transform to structured report
    const report = buildReport(results);

    // 3. Build HTML
    const html = buildReportHTML(report, { includePageBreakdown, maxPages, maxImages });

    console.log(`[API] Done — ${html.length.toLocaleString()} chars of HTML`);
    return sendHTML(res, html);
  } catch (err) {
    console.error(`[API] Error: ${err.message}`);
    return sendJSON(res, 500, { error: err.message });
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────

(async () => {
  // Pre-load the cover image so the first request is fast
  await initCoverImage();

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[API] Unhandled:', err);
      if (!res.headersSent) sendJSON(res, 500, { error: 'Internal server error.' });
    });
  });

  server.listen(PORT, () => {
    console.log(`\n✅  Web Audit API listening on http://localhost:${PORT}`);
    console.log(`   POST / with JSON body: { url, pages?, images?, full? }\n`);
  });
})();
