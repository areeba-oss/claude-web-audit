// main.js
const fetchAllPages        = require('./fetchAllPages');
const basicHealthCheck     = require('./basicHealthCheck');
const uiLayoutValidation   = require('./uiLayoutValidation');
// const navigationLinksAudit = require('./navigationLinksAudit');
const navigationLinksAuditReduced = require('./navigationLinksAudit');
const formsAudit           = require('./formsAudit');
const ecommerceAudit       = require('./ecommerceAudit');
const performanceAudit     = require('./performanceAudit');
const { getPageSnapshot, analyzePageWithAI } = require('./aiDetector');
const { chromium } = require('playwright');
const fs           = require('fs').promises;

const CONCURRENCY = 3;
const AI_ENABLED  = !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

function isHomepage(url) {
    try { return new URL(url).pathname.replace(/\/$/, '') === ''; }
    catch { return false; }
}

async function auditPage(browser, url) {
    const page            = await browser.newPage();
    const consoleErrors   = [];
    const consoleWarnings = [];
    const failedRequests  = [];

    page.on('console', msg => {
        if (msg.type() === 'error')   consoleErrors.push(msg.text());
        if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });
    page.on('requestfailed', req =>
        failedRequests.push({ url: req.url(), failure: req.failure()?.errorText })
    );

    try {
        console.log(`\n  📄 → ${url}`);
        const response   = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForLoadState('networkidle').catch(() => {});
        const httpStatus = response?.status() ?? null;

        // ── Step 1: Collect all raw data (parallel, no AI yet) ──────────────
        const [snapshot, perfRaw, linkRaw] = await Promise.all([
            getPageSnapshot(page),
            page.evaluate(() => {
                const nav = performance.getEntriesByType('navigation')[0];
                const fcp = performance.getEntriesByName('first-contentful-paint')[0];
                const resources = performance.getEntriesByType('resource').map(r => ({
                    url: r.name, type: r.initiatorType,
                    durationMs: Math.round(r.duration),
                    sizeKB: r.transferSize ? Math.round(r.transferSize / 1024) : null
                }));
                return {
                    fcp:      fcp ? Math.round(fcp.startTime) : null,
                    dcl:      nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
                    loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
                    ttfb:     nav ? Math.round(nav.responseStart - nav.requestStart) : null,
                    slowResources: resources.filter(r => r.durationMs > 1000),
                    largeImages:   resources.filter(r => r.type === 'img' && (r.sizeKB > 200 || r.durationMs > 500)),
                    resourceSummary: resources.reduce((acc, r) => {
                        if (!acc[r.type]) acc[r.type] = { count: 0, totalMs: 0, totalKB: 0 };
                        acc[r.type].count++; acc[r.type].totalMs += r.durationMs;
                        if (r.sizeKB) acc[r.type].totalKB += r.sizeKB;
                        return acc;
                    }, {})
                };
            }),
            // Collect links for broken link checking
            page.evaluate(() => {
                const getLinks = scope => Array.from(scope.querySelectorAll('a[href]'))
                    .map(a => ({ text: a.innerText?.trim().slice(0, 80), href: a.href }))
                    .filter(l => l.href && !l.href.startsWith('javascript:'));
                return getLinks(document);
            })
        ]);

        // Quick link validation (parallel with AI call below)
        const uniqueHrefs = [...new Set(linkRaw.map(l => l.href))];
        const linkValidationPromise = (async () => {
            const classify = h => {
                try {
                    const u = new URL(h), o = new URL(url).origin;
                    if (!['http:','https:'].includes(u.protocol)) return 'other';
                    if (u.hash && u.origin === o && u.pathname === new URL(url).pathname) return 'anchor';
                    return u.origin === o ? 'internal' : 'external';
                } catch { return 'other'; }
            };
            const internal = uniqueHrefs.filter(h => classify(h) === 'internal');
            const external = uniqueHrefs.filter(h => classify(h) === 'external');

            async function pLimit(tasks, c) {
                const results = new Array(tasks.length); let i = 0;
                const w = async () => { while (i < tasks.length) { const n = i++; results[n] = await tasks[n](); } };
                await Promise.all(Array.from({ length: c }, w)); return results;
            }
            const validate = async h => {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 20000);
                try {
                    const r = await fetch(h, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebAuditBot/1.0)' } });
                    return { url: h, status: r.status, ok: r.status < 400 };
                } catch (e) { return { url: h, status: null, ok: false, error: e.message.split('\n')[0] }; }
                finally { clearTimeout(t); }
            };
            const [iRes, eRes] = await Promise.all([
                pLimit(internal.map(h => () => validate(h)), 3),
                pLimit(external.map(h => () => validate(h)), 5)
            ]);
            const cache = new Map();
            [...iRes, ...eRes].forEach(r => cache.set(r.url, r));
            const broken = uniqueHrefs.map(h => cache.get(h)).filter(r => r && !r.ok && r.status !== null);
            return { cache, broken, internal, external };
        })();

        // ── Step 2: ONE AI call covering all 6 modules ──────────────────────
        const aiPromise = analyzePageWithAI({
            snapshot, consoleErrors, consoleWarnings, failedRequests,
            httpStatus, perfMetrics: perfRaw,
            brokenLinks: [], // will be empty initially — AI still gets page context
            url
        });

        // Run both in parallel
        const [linkData, aiResult] = await Promise.all([linkValidationPromise, aiPromise]);

        // Enrich AI link analysis with actual validation results
        if (aiResult?.links) {
            const rawBroken = linkData.broken;
            const aiBroken  = aiResult.links.genuinelyBroken || [];
            // Merge: keep AI's reasoning, but ensure we have actual broken URLs
            if (aiBroken.length === 0 && rawBroken.length > 0) {
                aiResult.links.genuinelyBroken = rawBroken.filter(l => l.status === 404 || l.status >= 500);
                aiResult.links.falsePositives  = rawBroken.filter(l => l.status === 401 || l.status === 403);
            }
        }

        // ── Step 3: All modules read from aiResult (no extra AI calls) ──────
        const [health, uiLayout, navigation, forms, ecommerce, performance] = await Promise.all([
            basicHealthCheck(page, url, { httpStatus, consoleErrors, consoleWarnings, failedRequests }, aiResult),
            uiLayoutValidation(page, url, aiResult),
            navigationLinksAuditReduced(page, url, aiResult, linkData),
            formsAudit(page, url, aiResult),
            ecommerceAudit(browser, page, url, aiResult),
            performanceAudit(page, url, aiResult, perfRaw)
        ]);

        const method = aiResult?.method || 'fallback';
        console.log(`     ✅ Done [${method}] health:${health.aiHealthScore} perf:${performance.performanceScore} links:${navigation.summary?.genuinelyBroken ?? 0} broken`);

        return { url, health, uiLayout, navigation, forms, ecommerce, performance };

    } catch (err) {
        console.error(`  ❌ Fatal: ${url} — ${err.message}`);
        return { url, fatalError: err.message };
    } finally {
        await page.close();
    }
}

function printSummary(results) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                  📊  AUDIT SUMMARY                    ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    const t = {
        pages: results.length, httpErrors: 0, blankScreens: 0,
        significantErrors: 0, criticalFailedReqs: 0,
        missingHeaders: 0, missingFooters: 0, missingCTAs: 0, missingLogos: 0,
        responsiveIssues: 0, genuinelyBrokenLinks: 0,
        formIssues: 0, ecommercePages: 0, ecommerceIssues: 0, poorPerformance: 0
    };

    for (const r of results) {
        if (r.fatalError) { console.log(`\n  💀 ${r.url}\n     ${r.fatalError}`); continue; }
        const issues = [];

        if (!r.health?.httpOk)                   { issues.push(`HTTP ${r.health?.httpStatus}`); t.httpErrors++; }
        if (r.health?.blankScreen)               { issues.push('Blank screen'); t.blankScreens++; }
        if ((r.health?.significantErrorCount||0) > 0) {
            const noise = (r.health.consoleErrorCount||0) - (r.health.significantErrorCount||0);
            issues.push(`${r.health.significantErrorCount} JS error(s) [${noise} noise filtered]`);
            t.significantErrors += r.health.significantErrorCount;
        }
        if ((r.health?.criticalFailedCount||0) > 0) { issues.push(`${r.health.criticalFailedCount} critical failed req(s)`); t.criticalFailedReqs += r.health.criticalFailedCount; }

        if (!r.uiLayout?.headerVisible) { issues.push('Header not visible'); t.missingHeaders++; }
        if (!r.uiLayout?.footerVisible) { issues.push('Footer not visible'); t.missingFooters++; }
        if (!r.uiLayout?.mainCTAVisible) { issues.push('No CTA found'); t.missingCTAs++; }
        if (!r.uiLayout?.logoVisible)   { issues.push('Logo not visible'); t.missingLogos++; }

        const respIssues = Object.entries(r.uiLayout?.responsiveness || {}).filter(([,v]) => !v.responsive).map(([k]) => k);
        if (respIssues.length) { issues.push(`Not responsive: ${respIssues.join(', ')}`); t.responsiveIssues++; }

        const broken = r.navigation?.summary?.genuinelyBroken || 0;
        const fps    = r.navigation?.summary?.falsePositives  || 0;
        if (broken > 0) { issues.push(`${broken} broken link(s)${fps ? ` (${fps} false+ excluded)` : ''}`); t.genuinelyBrokenLinks += broken; }

        (r.forms?.forms || []).filter(f => f.isCritical && f.criticalMissingValidation?.length).forEach(f => {
            issues.push(`Form [${f.purpose}]: missing ${f.criticalMissingValidation.join(', ')}`); t.formIssues++;
        });

        if (r.ecommerce?.isEcommerce) {
            t.ecommercePages++;
            if (!r.ecommerce.addToCartWorked)   { issues.push('Add to cart failed'); t.ecommerceIssues++; }
            if (!r.ecommerce.cartPageLoaded)     issues.push('Cart not accessible');
            if (!r.ecommerce.checkoutAccessible) issues.push('Checkout not accessible');
        }

        const perf = r.performance?.performanceScore;
        if (perf === 'poor' || perf === 'needs-improvement') {
            issues.push(`Perf: ${perf} — FCP ${r.performance?.firstContentfulPaint}ms TTFB ${r.performance?.timeToFirstByte}ms`);
            t.poorPerformance++;
            const topFix = (r.performance?.recommendations || []).find(rec => rec.impact === 'high');
            if (topFix) issues.push(`  Fix: ${topFix.fix}`);
        }

        if (!issues.length) console.log(`\n  ✅ ${r.url} — All checks passed`);
        else { console.log(`\n  ⚠️  ${r.url}`); issues.forEach(i => console.log(`     • ${i}`)); }
    }

    const ai = AI_ENABLED ? '✅ ON — Gemini 2.5 Flash-Lite (free)' : '⚠️  OFF — set GEMINI_API_KEY in .env';
    console.log('\n  ────────────────────────────────────────────────────');
    console.log(`  AI              : ${ai}`);
    console.log(`  Pages audited   : ${t.pages}`);
    console.log(`  HTTP errors     : ${t.httpErrors}`);
    console.log(`  Blank screens   : ${t.blankScreens}`);
    console.log(`  JS errors       : ${t.significantErrors}`);
    console.log(`  Failed requests : ${t.criticalFailedReqs}`);
    console.log(`  Missing headers : ${t.missingHeaders}`);
    console.log(`  Missing footers : ${t.missingFooters}`);
    console.log(`  Missing CTAs    : ${t.missingCTAs}`);
    console.log(`  Missing logos   : ${t.missingLogos}`);
    console.log(`  Responsive iss  : ${t.responsiveIssues}`);
    console.log(`  Broken links    : ${t.genuinelyBrokenLinks}`);
    console.log(`  Form issues     : ${t.formIssues}`);
    console.log(`  Ecommerce pages : ${t.ecommercePages}`);
    console.log(`  Ecommerce iss   : ${t.ecommerceIssues}`);
    console.log(`  Perf issues     : ${t.poorPerformance}`);
    console.log('  ────────────────────────────────────────────────────\n');
}

async function main(inputUrl) {
    const startTime = Date.now();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║               🔍  WEB AUDIT STARTING                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n  🌐 URL    : ${inputUrl}`);
    console.log(`  🤖 AI     : ${AI_ENABLED ? 'ON — 1 batched call/page' : 'OFF — set GEMINI_API_KEY in .env'}`);
    console.log(`  ⚡ Concur : ${CONCURRENCY} pages at a time`);

    let urls = [];
    if (isHomepage(inputUrl)) {
        console.log('\n━━━ Phase 1: Crawl ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const { allPages, stats } = await fetchAllPages(inputUrl, 25);
        console.log(`  Found ${allPages.size} pages (visited:${stats.visited} skipped:${stats.skipped} errors:${stats.errored})`);
        urls = [...allPages];
    } else {
        urls = [inputUrl];
    }

    console.log(`\n━━━ Auditing ${urls.length} page(s) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const browser = await chromium.launch({ headless: true });
    const results = [];

    for (let i = 0; i < urls.length; i += CONCURRENCY) {
        const batch = urls.slice(i, i + CONCURRENCY);
        console.log(`\n  ── Batch ${Math.floor(i/CONCURRENCY)+1}/${Math.ceil(urls.length/CONCURRENCY)} ──`);
        results.push(...await Promise.all(batch.map(u => auditPage(browser, u))));
    }

    await browser.close();
    printSummary(results);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const file = urls.length === 1 ? 'results-single.json' : 'results.json';
    await fs.writeFile(file, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`  💾 Saved → ${file}`);
    console.log(`  ⏱  Total time: ${elapsed}s\n`);
}

const inputUrl = process.argv[2];
if (!inputUrl) { console.error('  Usage: node --env-file=.env main.js https://example.com'); process.exit(1); }
main(inputUrl).then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });