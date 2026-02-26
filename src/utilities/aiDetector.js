// aiDetector.js — Single batched AI call per page (replaces 6 separate calls)

const MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(systemPrompt, userContent, maxTokens = 2048) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const text = (await res.json()).content?.[0]?.text || '';
  try {
    return JSON.parse(
      text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim(),
    );
  } catch {
    throw new Error(`Non-JSON: ${text.slice(0, 200)}`);
  }
}

// ── One snapshot extraction used by ALL modules ────────────────────────────
async function getPageSnapshot(page) {
  return await page.evaluate(() => {
    const parts = [`TITLE: ${document.title}`, `URL: ${location.href}`];
    document
      .querySelectorAll('h1,h2,h3')
      .forEach((h) => parts.push(`${h.tagName}: ${h.innerText?.trim().slice(0, 100)}`));
    document
      .querySelectorAll('button,input[type="submit"],input[type="button"],a[role="button"]')
      .forEach((el) =>
        parts.push(
          `BUTTON: ${(el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 80)}`,
        ),
      );
    Array.from(document.querySelectorAll('a[href]'))
      .slice(0, 50)
      .forEach((a) => parts.push(`LINK: ${a.innerText?.trim().slice(0, 50)} → ${a.href}`));
    Array.from(document.querySelectorAll('p,li,[class*="price"],[itemprop="price"]'))
      .slice(0, 15)
      .forEach((p) => {
        const t = p.innerText?.trim();
        if (t?.length > 10) parts.push(`TEXT: ${t.slice(0, 120)}`);
      });
    Array.from(document.querySelectorAll('form')).forEach((form, i) => {
      const fields = Array.from(form.querySelectorAll('input,textarea,select'))
        .map((f) => `${f.type || 'text'}[${f.name || f.placeholder || ''}]`)
        .join(', ');
      const submit =
        form.querySelector('[type="submit"],button:not([type])')?.innerText?.trim() || '';
      parts.push(`FORM${i}: fields=[${fields}] submit="${submit}"`);
    });
    return parts.filter(Boolean).join('\n');
  });
}

// ── SINGLE batched AI call covering ALL 6 modules ─────────────────────────
async function analyzePageWithAI({
  snapshot,
  consoleErrors,
  consoleWarnings,
  failedRequests,
  httpStatus,
  perfMetrics,
  brokenLinks,
  url,
}) {
  const system = `You are a web audit expert. Analyze the provided page data and return a single JSON object covering all audit areas.
Be concise and accurate. Use context, not keywords.

Return ONLY valid JSON with this exact structure:
{
  "health": {
    "overallScore": "good|warning|critical",
    "summary": "one sentence",
    "significantErrors": ["only real app errors, filter out analytics/tracker noise"],
    "criticalFailedRequests": [{"url":"...","reason":"..."}],
    "ignoredNoise": ["briefly what was filtered"]
  },
  "cta": {
    "found": true/false,
    "count": 0,
    "items": [{"text":"...","type":"purchase|signup|contact|download|other"}]
  },
  "links": {
    "genuinelyBroken": [{"url":"...","status":404,"reason":"..."}],
    "falsePositives": [{"url":"...","reason":"auth-required or expected"}],
    "severity": "none|low|medium|high",
    "summary": "one sentence"
  },
  "forms": [
    {
      "index": 0,
      "purpose": "login|registration|contact|search|checkout|newsletter|other",
      "criticalMissingValidation": ["list only what truly matters for this form type"],
      "isCritical": true/false
    }
  ],
  "ecommerce": {
    "isEcommerce": true/false,
    "confidence": "high|medium|low",
    "type": "product-listing|product-detail|cart|checkout|store-home|service|subscription|none",
    "productLinks": [],
    "reasoning": "one sentence"
  },
  "performance": {
    "overallScore": "good|needs-improvement|poor",
    "fcpAssessment": "good|needs-improvement|poor",
    "ttfbAssessment": "good|needs-improvement|poor",
    "topIssues": ["max 3 issues"],
    "recommendations": [{"issue":"...","impact":"high|medium|low","fix":"specific fix"}],
    "userImpact": "one sentence"
  }
}`;

  const noisePatterns = [
    /google-analytics/,
    /googletagmanager/,
    /pagead/,
    /doubleclick/,
    /facebook\.net/,
    /hotjar/,
  ];
  const isNoise = (u) => noisePatterns.some((p) => p.test(u || ''));

  const user = `URL: ${url}
HTTP: ${httpStatus}
Console Errors (${consoleErrors.length}): ${JSON.stringify(consoleErrors.filter((e) => !isNoise(e)).slice(0, 8))}
Failed Requests: ${JSON.stringify(
    failedRequests
      .filter((r) => !isNoise(r.url))
      .slice(0, 8)
      .map((r) => ({ url: r.url?.slice(0, 80), f: r.failure })),
  )}
Broken Links: ${JSON.stringify(brokenLinks.slice(0, 20).map((l) => ({ url: l.url?.slice(0, 80), status: l.status })))}
Perf — FCP:${perfMetrics.fcp}ms DCL:${perfMetrics.dcl}ms Load:${perfMetrics.loadTime}ms TTFB:${perfMetrics.ttfb}ms
Slow Resources: ${JSON.stringify(perfMetrics.slowResources?.slice(0, 4).map((r) => ({ url: r.url?.slice(0, 60), ms: r.durationMs })))}
Large Images: ${JSON.stringify(perfMetrics.largeImages?.slice(0, 4).map((r) => ({ url: r.url?.slice(0, 60), kb: r.sizeKB })))}

Page Snapshot:
${snapshot.slice(0, 3000)}`;

  try {
    return { ...(await callClaude(system, user, 2048)), method: 'ai' };
  } catch (err) {
    // Structured fallback
    return {
      method: 'fallback',
      health: {
        overallScore: consoleErrors.length > 3 ? 'warning' : 'good',
        summary: `HTTP ${httpStatus}`,
        significantErrors: consoleErrors.filter((e) => !isNoise(e)),
        criticalFailedRequests: failedRequests.filter((r) => !isNoise(r.url)),
        ignoredNoise: [],
      },
      cta: { found: false, count: 0, items: [] },
      links: {
        genuinelyBroken: brokenLinks.filter((l) => l.status === 404),
        falsePositives: [],
        severity: 'low',
        summary: '',
      },
      forms: [],
      ecommerce: {
        isEcommerce: false,
        confidence: 'low',
        type: 'none',
        productLinks: [],
        reasoning: err.message,
      },
      performance: {
        overallScore:
          (perfMetrics.fcp ?? 9999) > 3000
            ? 'poor'
            : (perfMetrics.fcp ?? 9999) > 1800
              ? 'needs-improvement'
              : 'good',
        fcpAssessment: 'unknown',
        ttfbAssessment: 'unknown',
        topIssues: [],
        recommendations: [],
        userImpact: '',
      },
    };
  }
}

module.exports = { getPageSnapshot, analyzePageWithAI };
