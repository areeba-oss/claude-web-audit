// fetchAllPages.js — parallel crawler with N concurrent workers

const { chromium } = require('playwright-core');
const { URL } = require('url');

const CRAWL_CONCURRENCY = 5; // pages crawled simultaneously

function normalizeUrl(link, base) {
  try {
    const u = new URL(link, base);
    u.hash = '';
    if (u.pathname.endsWith('/') && u.pathname.length > 1) u.pathname = u.pathname.slice(0, -1);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.href;
  } catch {
    return null;
  }
}

async function fetchAllPages(homepage, maxPages = 25) {
  // Resolve chromium path same as auditor.js
  const fss = require('fs');
  function getChromiumPath() {
    if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH;
    const candidates = [
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      '/opt/google/chrome/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
    ];
    for (const p of candidates) {
      try { fss.accessSync(p, fss.constants.X_OK); return p; } catch {}
    }
    return undefined;
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: getChromiumPath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    // Block images/fonts/media during crawl — we only need links, not visual assets
    // This alone can cut crawl time by 40-60%
  });

  // Block unnecessary resources during crawl phase
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
      return route.abort();
    }
    return route.continue();
  });

  const origin = new URL(homepage).origin;
  const visited = new Set();
  const queued = new Set();
  const queue = [];
  const stats = { visited: 0, skipped: 0, errored: 0 };

  const start = normalizeUrl(homepage);
  if (start) {
    queue.push(start);
    queued.add(start);
  }

  // ── Parallel worker pool ───────────────────────────────────────────────
  async function worker() {
    const page = await context.newPage();
    try {
      while (true) {
        // Grab next URL — stop if queue empty or limit reached
        let url;
        while (true) {
          if (visited.size >= maxPages) return;
          url = queue.shift();
          if (url !== undefined) break;
          // Queue temporarily empty but other workers may add more — wait briefly
          await new Promise((r) => setTimeout(r, 100));
          if (queue.length === 0 && visited.size + queued.size <= visited.size) return;
        }

        if (!url || visited.has(url)) continue;
        visited.add(url);

        try {
          const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

          if (!res || res.status() >= 400) {
            stats.skipped++;
            continue;
          }
          stats.visited++;

          // Extract links
          const links = await page.evaluate(() =>
            Array.from(document.querySelectorAll('a[href]'), (a) => a.href),
          );

          for (const link of links) {
            const norm = normalizeUrl(link, url);
            if (!norm) continue;
            if (
              norm.startsWith(origin) &&
              !visited.has(norm) &&
              !queued.has(norm) &&
              visited.size + queued.size < maxPages * 2
            ) {
              queued.add(norm);
              queue.push(norm);
            }
          }
        } catch {
          stats.errored++;
        }
      }
    } finally {
      await page.close();
    }
  }

  // Launch N workers simultaneously
  const workers = Array.from({ length: Math.min(CRAWL_CONCURRENCY, maxPages) }, worker);
  await Promise.allSettled(workers);

  await browser.close();

  return {
    allPages: visited,
    stats: { ...stats, total: visited.size },
  };
}

module.exports = fetchAllPages;