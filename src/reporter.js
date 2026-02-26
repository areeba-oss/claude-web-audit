const fs = require('fs');

// ─── Helpers ────────────────────────────────────────────────────────────────

function scoreLabel(score) {
  if (score === 'good') return { label: 'Good', emoji: '✅', color: '#22c55e' };
  if (score === 'needs_improvement')
    return { label: 'Needs Improvement', emoji: '⚠️', color: '#f59e0b' };
  return { label: 'Poor', emoji: '❌', color: '#ef4444' };
}

function msToSeconds(ms) {
  return ms ? (ms / 1000).toFixed(2) + 's' : null;
}

function fcpGrade(ms) {
  if (!ms) return null;
  if (ms < 1800) return { label: 'Fast', color: '#22c55e' };
  if (ms < 3000) return { label: 'Moderate', color: '#f59e0b' };
  return { label: 'Slow', color: '#ef4444' };
}

function ttfbGrade(ms) {
  if (!ms) return null;
  if (ms < 200) return { label: 'Excellent', color: '#22c55e' };
  if (ms < 500) return { label: 'Acceptable', color: '#f59e0b' };
  return { label: 'Slow', color: '#ef4444' };
}

function mobileGrade(responsive, hasScroll) {
  if (responsive && !hasScroll) return { label: 'Fully Responsive', color: '#22c55e', score: 100 };
  if (!responsive && hasScroll) return { label: 'Not Mobile-Ready', color: '#ef4444', score: 20 };
  return { label: 'Partial', color: '#f59e0b', score: 60 };
}

function navHealthLabel(health) {
  if (health === 'good') return { label: 'All Links Working', color: '#22c55e' };
  if (health === 'issues') return { label: 'Minor Issues Found', color: '#f59e0b' };
  return { label: 'Broken Links Detected', color: '#ef4444' };
}

function computeOverallScore(page) {
  let total = 0;
  let count = 0;

  // Health
  if (page.health?.httpOk) {
    total += 100;
    count++;
  } else {
    total += 0;
    count++;
  }

  // Performance
  const fcp = page.performance?.firstContentfulPaint;
  if (fcp) {
    total += fcp < 1800 ? 100 : fcp < 3000 ? 65 : 30;
    count++;
  }

  const ttfb = page.performance?.timeToFirstByte;
  if (ttfb) {
    total += ttfb < 200 ? 100 : ttfb < 500 ? 70 : 30;
    count++;
  }

  // Mobile
  const mobile = page.uiLayout?.responsiveness?.mobile;
  if (mobile) {
    total += mobile.responsive && !mobile.hasHorizontalScroll ? 100 : 20;
    count++;
  }

  // Navigation
  if (page.navigation?.navigationHealth === 'good') {
    total += 100;
    count++;
  } else if (page.navigation?.navigationHealth === 'issues') {
    total += 70;
    count++;
  } else {
    total += 30;
    count++;
  }

  // No console errors bonus
  if (page.health?.consoleErrorCount === 0) {
    total += 100;
    count++;
  } else {
    total += Math.max(0, 100 - page.health.consoleErrorCount * 20);
    count++;
  }

  return Math.round(total / count);
}

function gradeFromScore(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { grade: 'B', label: 'Good', color: '#84cc16' };
  if (score >= 60) return { grade: 'C', label: 'Fair', color: '#f59e0b' };
  if (score >= 40) return { grade: 'D', label: 'Poor', color: '#f97316' };
  return { grade: 'F', label: 'Critical Issues', color: '#ef4444' };
}

// ─── Per-Page Transformer ────────────────────────────────────────────────────

function transformPage(raw) {
  const url = raw.url;
  const slug = new URL(url).pathname || '/';

  // --- Health ---
  const health = {
    status: raw.health?.httpStatus ?? null,
    ok: raw.health?.httpOk ?? false,
    consoleErrors: raw.health?.consoleErrorCount ?? 0,
    significantErrors: raw.health?.significantErrorCount ?? 0,
    failedRequests: raw.health?.failedRequestCount ?? 0,
    criticalFailures: raw.health?.criticalFailedCount ?? 0,
    summary: raw.health?.aiHealthSummary ?? 'Unknown',
    rating: raw.health?.aiHealthScore ?? 'unknown',
  };

  // --- Performance ---
  const perf = raw.performance ?? {};
  const fcpMs = perf.firstContentfulPaint;
  const ttfbMs = perf.timeToFirstByte;
  const performance = {
    score: perf.performanceScore ?? 'unknown',
    firstContentfulPaint: { ms: fcpMs, formatted: msToSeconds(fcpMs), grade: fcpGrade(fcpMs) },
    timeToFirstByte: { ms: ttfbMs, formatted: msToSeconds(ttfbMs), grade: ttfbGrade(ttfbMs) },
    domContentLoaded: { ms: perf.domContentLoaded, formatted: msToSeconds(perf.domContentLoaded) },
    totalLoadTime: { ms: perf.totalLoadTime, formatted: msToSeconds(perf.totalLoadTime) },
    resources: perf.resourceSummary ?? {},
    slowResources: (perf.slowResources ?? []).map((r) => ({
      url: r.url,
      type: r.type,
      duration: msToSeconds(r.durationMs),
      sizeKB: r.sizeKB,
    })),
    largeImages: (perf.largeImages ?? []).map((i) => ({
      url: i.url,
      duration: msToSeconds(i.durationMs),
      sizeKB: i.sizeKB,
    })),
    issues: perf.topIssues ?? [],
    recommendations: perf.recommendations ?? [],
  };

  // --- Mobile / Responsiveness ---
  const resp = raw.uiLayout?.responsiveness ?? {};
  const responsiveness = {
    mobile: {
      ...mobileGrade(resp.mobile?.responsive, resp.mobile?.hasHorizontalScroll),
      details: resp.mobile,
    },
    tablet: {
      label: resp.tablet?.responsive ? 'Responsive' : 'Issues',
      color: resp.tablet?.responsive ? '#22c55e' : '#ef4444',
      details: resp.tablet,
    },
    desktop: {
      label: resp.desktop?.responsive ? 'Responsive' : 'Issues',
      color: resp.desktop?.responsive ? '#22c55e' : '#ef4444',
      details: resp.desktop,
    },
  };

  // --- Navigation ---
  const nav = raw.navigation ?? {};
  const navigation = {
    health: navHealthLabel(nav.navigationHealth),
    severity: nav.severity ?? 'low',
    totalLinks: nav.metrics?.totalLinks ?? 0,
    internalLinks: nav.metrics?.internalLinks ?? 0,
    externalLinks: nav.metrics?.externalLinks ?? 0,
    brokenLinks: nav.brokenLinks ?? [],
    protectedLinks: nav.protectedLinks ?? [],
    issues: nav.navigationIssues ?? [],
    insight: nav.insight ?? '',
  };

  // --- Layout ---
  const layout = {
    headerFound: raw.uiLayout?.headerFound ?? false,
    headerVisible: raw.uiLayout?.headerVisible ?? false,
    footerFound: raw.uiLayout?.footerFound ?? false,
    footerVisible: raw.uiLayout?.footerVisible ?? false,
    logoDetected: raw.uiLayout?.logoDetected ?? false,
    logoLinksHome: raw.uiLayout?.logoLinksHome ?? false,
    ctaCount: raw.uiLayout?.ctaCount ?? 0,
    ctaTexts: raw.uiLayout?.ctaTexts ?? [],
  };

  // --- Score ---
  const overallScore = computeOverallScore(raw);
  const grade = gradeFromScore(overallScore);

  // --- Findings (human-readable highlights for the report) ---
  const findings = [];
  const opportunities = [];

  if (!health.ok)
    findings.push({
      type: 'critical',
      message: `Page returned HTTP ${health.status} — users may not be able to access this page.`,
    });
  if (health.consoleErrors > 0)
    findings.push({
      type: 'warning',
      message: `${health.consoleErrors} console error(s) detected — may indicate broken functionality.`,
    });
  if (fcpMs && fcpMs >= 3000)
    findings.push({
      type: 'warning',
      message: `Slow page paint (${msToSeconds(fcpMs)}) — users may perceive the page as sluggish.`,
    });
  if (ttfbMs && ttfbMs >= 500)
    findings.push({
      type: 'warning',
      message: `High server response time (${msToSeconds(ttfbMs)}) — server may need optimisation.`,
    });
  if (resp.mobile && !resp.mobile.responsive)
    findings.push({
      type: 'critical',
      message: "Page is NOT mobile-responsive — failing on the majority of today's web traffic.",
    });
  if (nav.brokenLinks?.length > 0)
    findings.push({
      type: 'critical',
      message: `${nav.brokenLinks.length} broken link(s) found — damages SEO and user trust.`,
    });
  if (nav.navigationIssues?.length > 0)
    findings.push({
      type: 'info',
      message: `${nav.navigationIssues.length} navigation anchor link(s) have unknown resolution.`,
    });
  if (!layout.ctaCount)
    findings.push({
      type: 'info',
      message: 'No clear call-to-action buttons detected — missed conversion opportunity.',
    });
  if (perf.slowResources?.length > 0)
    opportunities.push(
      `Optimise ${perf.slowResources.length} slow-loading resource(s) to improve page speed.`,
    );
  if (!resp.mobile?.responsive)
    opportunities.push('Implement responsive CSS breakpoints for mobile devices (375px viewport).');
  if (!layout.ctaCount)
    opportunities.push('Add prominent CTA buttons to drive user engagement and conversions.');
  if (nav.navigationIssues?.length > 0)
    opportunities.push('Audit and fix anchor-based navigation links.');

  if (findings.length === 0)
    findings.push({ type: 'success', message: 'No critical issues detected on this page.' });

  return {
    url,
    slug,
    overallScore,
    grade,
    health,
    performance,
    responsiveness,
    navigation,
    layout,
    findings,
    opportunities,
  };
}

// ─── Summary Aggregator ──────────────────────────────────────────────────────

function buildSummary(pages) {
  const scores = pages.map((p) => p.overallScore);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const grade = gradeFromScore(avgScore);

  const criticalCount = pages
    .flatMap((p) => p.findings)
    .filter((f) => f.type === 'critical').length;
  const warningCount = pages.flatMap((p) => p.findings).filter((f) => f.type === 'warning').length;
  const mobileFailCount = pages.filter((p) => p.responsiveness.mobile.score <= 20).length;
  const allOpportunities = [...new Set(pages.flatMap((p) => p.opportunities))];

  const avgFcp = Math.round(
    pages
      .filter((p) => p.performance.firstContentfulPaint.ms)
      .reduce((a, p) => a + p.performance.firstContentfulPaint.ms, 0) /
      pages.filter((p) => p.performance.firstContentfulPaint.ms).length,
  );

  const topFindings = [];
  if (criticalCount > 0)
    topFindings.push(`🚨 ${criticalCount} critical issue(s) found across ${pages.length} pages`);
  if (mobileFailCount > 0)
    topFindings.push(`📱 ${mobileFailCount} of ${pages.length} pages are not mobile-ready`);
  if (warningCount > 0) topFindings.push(`⚠️ ${warningCount} warning(s) flagged for review`);
  if (topFindings.length === 0)
    topFindings.push('✅ No critical issues detected across audited pages');

  return {
    pagesAudited: pages.length,
    averageScore: avgScore,
    grade,
    criticalIssues: criticalCount,
    warnings: warningCount,
    mobileFailures: mobileFailCount,
    averageFirstContentfulPaint: {
      ms: avgFcp,
      formatted: msToSeconds(avgFcp),
      grade: fcpGrade(avgFcp),
    },
    topFindings,
    allOpportunities,
    pageScores: pages.map((p) => ({
      url: p.url,
      slug: p.slug,
      score: p.overallScore,
      grade: p.grade,
    })),
  };
}

// ─── Report Builder ──────────────────────────────────────────────────────────

function buildReport(rawPages) {
  const transformed = rawPages.map(transformPage);
  const summary = buildSummary(transformed);

  // Derive site name + domain from first URL
  const firstUrl = new URL(rawPages[0].url);
  const domain = firstUrl.hostname;

  return {
    meta: {
      reportTitle: `Web Audit Report — ${domain}`,
      domain,
      generatedAt: new Date().toISOString(),
      auditedPages: transformed.length,
      tool: 'Expand Testing Web Auditor',
      version: '1.0',
    },
    executiveSummary: {
      headline:
        summary.grade.score >= 75
          ? `Your site scores ${summary.averageScore}/100 — a solid foundation with clear wins available.`
          : `Your site scores ${summary.averageScore}/100 — there are meaningful improvements that could boost performance and conversions.`,
      overallScore: summary.averageScore,
      grade: summary.grade,
      keyStats: [
        { label: 'Pages Audited', value: summary.pagesAudited, icon: '🔍' },
        {
          label: 'Critical Issues',
          value: summary.criticalIssues,
          icon: '🚨',
          highlight: summary.criticalIssues > 0,
        },
        { label: 'Warnings', value: summary.warnings, icon: '⚠️' },
        {
          label: 'Mobile Failures',
          value: summary.mobileFailures,
          icon: '📱',
          highlight: summary.mobileFailures > 0,
        },
        {
          label: 'Avg. Load Speed',
          value: summary.averageFirstContentfulPaint.formatted,
          icon: '⚡',
          subLabel: summary.averageFirstContentfulPaint.grade?.label,
        },
      ],
      topFindings: summary.topFindings,
      callToAction:
        'The issues identified below are actionable improvements that can increase search rankings, improve user experience, and drive more conversions. Our team can resolve these efficiently.',
    },
    pageBreakdown: transformed,
    opportunitySummary: {
      title: 'Growth Opportunities Identified',
      description:
        'Addressing these items can directly impact your search rankings, page speed, and user engagement.',
      items: summary.allOpportunities.map((opp, i) => ({ id: i + 1, opportunity: opp })),
    },
    categoryScorecard: {
      title: 'How Your Site Performs by Category',
      categories: [
        {
          name: 'Page Health',
          description: 'HTTP status, server errors, and critical failures',
          score: Math.round(
            transformed.reduce((a, p) => a + (p.health.ok ? 100 : 0), 0) / transformed.length,
          ),
        },
        {
          name: 'Page Speed',
          description: 'First Contentful Paint, TTFB, and load times',
          score: Math.round(
            transformed.reduce((a, p) => {
              const fcp = p.performance.firstContentfulPaint.ms;
              return a + (fcp < 1800 ? 100 : fcp < 3000 ? 60 : 25);
            }, 0) / transformed.length,
          ),
        },
        {
          name: 'Mobile Experience',
          description: 'Responsiveness across mobile, tablet, and desktop',
          score: Math.round(
            transformed.reduce((a, p) => a + p.responsiveness.mobile.score, 0) / transformed.length,
          ),
        },
        {
          name: 'Navigation & Links',
          description: 'Broken links, anchor integrity, and link structure',
          score: Math.round(
            transformed.reduce(
              (a, p) => a + (p.navigation.health.label === 'All Links Working' ? 100 : 65),
              0,
            ) / transformed.length,
          ),
        },
        {
          name: 'Layout & UX',
          description: 'Header, footer, logo, and call-to-action presence',
          score: Math.round(
            transformed.reduce((a, p) => {
              let s = 0;
              if (p.layout.headerVisible) s += 25;
              if (p.layout.footerVisible) s += 25;
              if (p.layout.logoDetected) s += 25;
              if (p.layout.ctaCount > 0) s += 25;
              return a + s;
            }, 0) / transformed.length,
          ),
        },
      ].map((c) => ({ ...c, grade: gradeFromScore(c.score) })),
    },
  };
}

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: npm run report raw-json/<input.json>');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(`raw-json/${inputPath}`, 'utf8'));
const pages = Array.isArray(raw) ? raw : [raw];
const report = buildReport(pages);

const outFile = 'report-json/report.json';
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`✅  Report written to: ${outFile}`);
console.log(`📊  Pages processed: ${report.meta.auditedPages}`);
console.log(
  `🏆  Overall score: ${report.executiveSummary.overallScore}/100 (${report.executiveSummary.grade.grade})`,
);
