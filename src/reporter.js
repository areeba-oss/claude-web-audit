const fs = require('fs');

// ─── Helpers ────────────────────────────────────────────────────────────────

function msToSeconds(ms) {
  return ms ? (ms / 1000).toFixed(2) + 's' : null;
}

function fcpGrade(ms) {
  if (!ms) return null;
  if (ms < 1800) return { label: 'Fast', color: '#16a34a' };
  if (ms < 3000) return { label: 'Moderate', color: '#b45309' };
  return { label: 'Slow', color: '#dc2626' };
}

function ttfbGrade(ms) {
  if (!ms) return null;
  if (ms < 200) return { label: 'Excellent', color: '#16a34a' };
  if (ms < 500) return { label: 'Acceptable', color: '#b45309' };
  return { label: 'Slow', color: '#dc2626' };
}

function loadTimeGrade(ms) {
  if (!ms) return null;
  if (ms < 3000) return { label: 'Fast', color: '#16a34a' };
  if (ms < 6000) return { label: 'Moderate', color: '#b45309' };
  return { label: 'Slow', color: '#dc2626' };
}

function mobileGrade(responsive, hasScroll) {
  if (responsive && !hasScroll) return { label: 'Fully Responsive', color: '#16a34a', score: 100 };
  if (!responsive && hasScroll) return { label: 'Not Mobile-Ready', color: '#dc2626', score: 20 };
  return { label: 'Partial', color: '#b45309', score: 60 };
}

function navHealthLabel(health) {
  if (health === 'good') return { label: 'All Links Working', color: '#16a34a' };
  if (health === 'issues') return { label: 'Minor Issues Found', color: '#b45309' };
  return { label: 'Broken Links Detected', color: '#dc2626' };
}

function gradeFromScore(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#16a34a' };
  if (score >= 75) return { grade: 'B', label: 'Good', color: '#65a30d' };
  if (score >= 60) return { grade: 'C', label: 'Fair', color: '#b45309' };
  if (score >= 40) return { grade: 'D', label: 'Poor', color: '#ea580c' };
  return { grade: 'F', label: 'Critical Issues', color: '#dc2626' };
}

// ─── Continuous Scoring Engine ───────────────────────────────────────────────
// Uses piecewise linear interpolation for smooth curves instead of binary buckets.
// Each breakpoint array: [[thresholdMs, score], ...] sorted ascending by threshold.

function interpolateScore(value, breakpoints) {
  if (value == null || isNaN(value)) return null;
  if (value <= breakpoints[0][0]) return breakpoints[0][1];
  if (value >= breakpoints[breakpoints.length - 1][0])
    return breakpoints[breakpoints.length - 1][1];
  for (let i = 1; i < breakpoints.length; i++) {
    if (value <= breakpoints[i][0]) {
      const [t0, s0] = breakpoints[i - 1];
      const [t1, s1] = breakpoints[i];
      return Math.round(s0 + ((s1 - s0) * (value - t0)) / (t1 - t0));
    }
  }
  return breakpoints[breakpoints.length - 1][1];
}

// Breakpoints tuned to Web Vitals standards with steeper mid-range gradients
// for meaningful differentiation between "good" and "just passing" pages.
const CURVES = {
  // FCP: Under 1s excellent, 1s-1.8s good (steeper gradient), 1.8s-3s needs work, 3s+ poor
  fcp: [
    [0, 100],
    [500, 98],
    [800, 92],
    [1000, 82],
    [1200, 72],
    [1500, 58],
    [1800, 45],
    [2500, 25],
    [3500, 8],
    [5000, 0],
  ],
  // TTFB: <100ms ideal, 100-250ms great, 250-500ms acceptable (steeper), 500+ problematic
  ttfb: [
    [0, 100],
    [80, 97],
    [150, 90],
    [250, 75],
    [350, 55],
    [500, 32],
    [700, 15],
    [1000, 5],
    [2000, 0],
  ],
  // Total load time: <2s ideal, 2-3.5s good, 3.5-6s sluggish, 6s+ poor
  loadTime: [
    [0, 100],
    [1000, 97],
    [2000, 88],
    [3000, 72],
    [4000, 55],
    [5500, 32],
    [7000, 15],
    [10000, 3],
    [15000, 0],
  ],
  // DCL: <1s excellent, 1-1.5s good, 1.5-2.5s moderate, 2.5s+ poor
  dcl: [
    [0, 100],
    [600, 95],
    [1000, 82],
    [1400, 65],
    [1800, 48],
    [2200, 30],
    [3000, 12],
    [5000, 0],
  ],
  // Failed requests: 0 ideal, steep penalty for each
  failedRequests: [
    [0, 100],
    [1, 90],
    [3, 72],
    [6, 52],
    [10, 32],
    [18, 15],
    [30, 5],
    [50, 0],
  ],
  // Slow resources: each one is notable drag
  slowResources: [
    [0, 100],
    [1, 78],
    [2, 58],
    [3, 42],
    [5, 22],
    [8, 8],
    [12, 0],
  ],
  // Large images: unoptimised assets
  largeImages: [
    [0, 100],
    [1, 68],
    [2, 45],
    [4, 20],
    [6, 5],
    [10, 0],
  ],
  // Page weight (KB): lighter is better
  pageWeight: [
    [0, 100],
    [100, 96],
    [300, 82],
    [600, 60],
    [1000, 38],
    [2000, 15],
    [5000, 0],
  ],
  // Total resource count: fewer = leaner pages
  resourceCount: [
    [0, 100],
    [10, 95],
    [25, 78],
    [40, 58],
    [60, 35],
    [100, 12],
    [200, 0],
  ],
  // Console errors: meaningful penalty per error
  consoleErrors: [
    [0, 100],
    [1, 72],
    [3, 45],
    [5, 25],
    [10, 8],
    [20, 0],
  ],
  // Navigation issues count
  navIssues: [
    [0, 100],
    [1, 78],
    [3, 52],
    [5, 30],
    [10, 10],
    [20, 0],
  ],
};

// ─── Category Score Calculator ───────────────────────────────────────────────
// Returns { overall, categories: { health, speed, resources, mobile, navigation, layout } }

function computeCategoryScores(healthData, perfData, layoutData, navData) {
  // ── Health & Reliability (15%) ──
  const httpScore = healthData.httpOk ? 100 : 0;
  const errorScore =
    interpolateScore(healthData.significantErrorCount ?? 0, CURVES.consoleErrors) ?? 100;
  const failedReqScore =
    interpolateScore(healthData.failedRequestCount ?? 0, CURVES.failedRequests) ?? 100;
  const criticalFailScore = (healthData.criticalFailedCount ?? 0) > 0 ? 0 : 100;
  const blankScreenPenalty = healthData.blankScreen ? 0 : 100;
  const healthCat = Math.round(
    httpScore * 0.3 +
      errorScore * 0.2 +
      failedReqScore * 0.25 +
      criticalFailScore * 0.15 +
      blankScreenPenalty * 0.1,
  );

  // ── Page Speed (30%) ──
  const fcpScore = interpolateScore(perfData.firstContentfulPaint, CURVES.fcp) ?? 50;
  const ttfbScore = interpolateScore(perfData.timeToFirstByte, CURVES.ttfb) ?? 50;
  const loadScore = interpolateScore(perfData.totalLoadTime, CURVES.loadTime) ?? 50;
  const dclScore = interpolateScore(perfData.domContentLoaded, CURVES.dcl) ?? 50;
  const speedCat = Math.round(
    fcpScore * 0.35 + ttfbScore * 0.25 + loadScore * 0.25 + dclScore * 0.15,
  );

  // ── Resource Efficiency (15%) ──
  const slowResCount = (perfData.slowResources ?? []).length;
  const largeImgCount = (perfData.largeImages ?? []).length;
  const resourceSummary = perfData.resourceSummary ?? {};
  const totalResources = Object.values(resourceSummary).reduce((a, r) => a + (r.count || 0), 0);
  const totalWeightKB = Object.values(resourceSummary).reduce((a, r) => a + (r.totalKB || 0), 0);
  const slowScore = interpolateScore(slowResCount, CURVES.slowResources) ?? 100;
  const largeImgScore = interpolateScore(largeImgCount, CURVES.largeImages) ?? 100;
  const weightScore = interpolateScore(totalWeightKB, CURVES.pageWeight) ?? 80;
  const resCountScore = interpolateScore(totalResources, CURVES.resourceCount) ?? 80;
  const resourcesCat = Math.round(
    slowScore * 0.3 + largeImgScore * 0.25 + weightScore * 0.25 + resCountScore * 0.2,
  );

  // ── Mobile & Responsiveness (15%) ──
  const resp = layoutData.responsiveness ?? {};
  const mobileResp = resp.mobile?.responsive && !resp.mobile?.hasHorizontalScroll;
  const tabletResp = resp.tablet?.responsive ?? false;
  const desktopResp = resp.desktop?.responsive ?? true;
  const mobileCat = Math.round(
    (mobileResp ? 100 : 0) * 0.55 + (tabletResp ? 100 : 0) * 0.3 + (desktopResp ? 100 : 0) * 0.15,
  );

  // ── Navigation & Links (10%) ──
  const navHealthScore =
    navData.navigationHealth === 'good' ? 100 : navData.navigationHealth === 'issues' ? 55 : 15;
  const brokenCount = (navData.brokenLinks ?? []).length;
  const brokenPenalty = brokenCount === 0 ? 100 : Math.max(0, 100 - brokenCount * 25);
  const navIssueScore =
    interpolateScore((navData.navigationIssues ?? []).length, CURVES.navIssues) ?? 100;
  const navigationCat = Math.round(
    navHealthScore * 0.4 + brokenPenalty * 0.35 + navIssueScore * 0.25,
  );

  // ── Layout & UX (15%) ──
  let layoutCat = 0;
  if (layoutData.headerVisible) layoutCat += 22;
  if (layoutData.footerVisible) layoutCat += 18;
  if (layoutData.logoDetected) layoutCat += 12;
  if (layoutData.logoLinksHome) layoutCat += 5;
  if (layoutData.mainCTAVisible) layoutCat += 18;
  if ((layoutData.ctaCount ?? 0) > 0) layoutCat += Math.min(15, (layoutData.ctaCount ?? 0) * 5);
  else layoutCat += 0; // No CTAs = missed 15 points
  // Small bonus for having both header AND footer (complete page structure)
  if (layoutData.headerVisible && layoutData.footerVisible) layoutCat += 10;

  layoutCat = Math.min(100, layoutCat);

  // ── Weighted Overall ──
  const overall = Math.round(
    healthCat * 0.15 +
      speedCat * 0.3 +
      resourcesCat * 0.15 +
      mobileCat * 0.15 +
      navigationCat * 0.1 +
      layoutCat * 0.15,
  );

  return {
    overall,
    categories: {
      health: healthCat,
      speed: speedCat,
      resources: resourcesCat,
      mobile: mobileCat,
      navigation: navigationCat,
      layout: layoutCat,
    },
  };
}

// ─── Per-Page Transformer ────────────────────────────────────────────────────

function transformPage(raw) {
  const url = raw.url;
  const slug = new URL(url).pathname || '/';

  // ── CORRECT FIELD MAPPING ──
  //  raw.health     → health data
  //  raw.ecommerce  → performance data (FCP, TTFB, resources)
  //  raw.navigation → UI layout data (header, footer, logo, CTAs, responsiveness)
  //  raw.performance→ navigation data (links, broken links, nav health)
  //  raw.uiLayout   → forms data
  //  raw.forms      → ecommerce data
  const healthRaw = raw.health ?? {};
  const perfRaw = raw.ecommerce ?? {};
  const layoutRaw = raw.navigation ?? {};
  const navRaw = raw.performance ?? {};
  const formsRaw = raw.uiLayout ?? {};
  const ecommerceRaw = raw.forms ?? {};

  // --- Health ---
  const health = {
    status: healthRaw.httpStatus ?? null,
    ok: healthRaw.httpOk ?? false,
    blankScreen: healthRaw.blankScreen ?? false,
    consoleErrors: healthRaw.consoleErrorCount ?? 0,
    significantErrors: healthRaw.significantErrorCount ?? 0,
    significantErrorMessages: (healthRaw.significantErrors ?? []).slice(0, 5),
    failedRequests: healthRaw.failedRequestCount ?? 0,
    criticalFailures: healthRaw.criticalFailedCount ?? 0,
    summary: healthRaw.aiHealthSummary ?? 'Unknown',
    rating: healthRaw.aiHealthScore ?? 'unknown',
  };

  // --- Performance ---
  const fcpMs = perfRaw.firstContentfulPaint;
  const ttfbMs = perfRaw.timeToFirstByte;
  const dclMs = perfRaw.domContentLoaded;
  const totalMs = perfRaw.totalLoadTime;
  const performance = {
    firstContentfulPaint: { ms: fcpMs, formatted: msToSeconds(fcpMs), grade: fcpGrade(fcpMs) },
    timeToFirstByte: { ms: ttfbMs, formatted: msToSeconds(ttfbMs), grade: ttfbGrade(ttfbMs) },
    domContentLoaded: { ms: dclMs, formatted: msToSeconds(dclMs) },
    totalLoadTime: { ms: totalMs, formatted: msToSeconds(totalMs), grade: loadTimeGrade(totalMs) },
    resources: perfRaw.resourceSummary ?? {},
    totalResources: Object.values(perfRaw.resourceSummary ?? {}).reduce(
      (a, r) => a + (r.count || 0),
      0,
    ),
    totalResourceSizeKB: Object.values(perfRaw.resourceSummary ?? {}).reduce(
      (a, r) => a + (r.totalKB || 0),
      0,
    ),
    slowResources: (perfRaw.slowResources ?? []).slice(0, 5).map((r) => ({
      url: r.url,
      type: r.type,
      duration: msToSeconds(r.durationMs),
      sizeKB: r.sizeKB,
    })),
    largeImages: (perfRaw.largeImages ?? []).slice(0, 5).map((i) => ({
      url: i.url,
      duration: msToSeconds(i.durationMs),
      sizeKB: i.sizeKB,
    })),
  };

  // --- Mobile / Responsiveness ---
  const resp = layoutRaw.responsiveness ?? {};
  const responsiveness = {
    mobile: {
      ...mobileGrade(resp.mobile?.responsive, resp.mobile?.hasHorizontalScroll),
      details: resp.mobile,
    },
    tablet: {
      label: resp.tablet?.responsive ? 'Responsive' : 'Issues',
      color: resp.tablet?.responsive ? '#16a34a' : '#dc2626',
      details: resp.tablet,
    },
    desktop: {
      label: resp.desktop?.responsive ? 'Responsive' : 'Issues',
      color: resp.desktop?.responsive ? '#16a34a' : '#dc2626',
      details: resp.desktop,
    },
  };

  // --- Navigation ---
  const navMetrics = navRaw.metrics ?? {};
  const navigation = {
    health: navHealthLabel(navRaw.navigationHealth),
    severity: navRaw.severity ?? 'low',
    totalLinks: navMetrics.totalLinks ?? 0,
    internalLinks: navMetrics.internalLinks ?? 0,
    externalLinks: navMetrics.externalLinks ?? 0,
    brokenLinks: navRaw.brokenLinks ?? [],
    protectedLinks: navRaw.protectedLinks ?? [],
    issues: (navRaw.navigationIssues ?? []).slice(0, 5),
    insight: navRaw.insight ?? '',
  };

  // --- Layout / UX ---
  const layout = {
    headerFound: layoutRaw.headerFound ?? false,
    headerVisible: layoutRaw.headerVisible ?? false,
    footerFound: layoutRaw.footerFound ?? false,
    footerVisible: layoutRaw.footerVisible ?? false,
    logoDetected: layoutRaw.logoDetected ?? false,
    logoVisible: layoutRaw.logoVisible ?? false,
    logoLinksHome: layoutRaw.logoLinksHome ?? false,
    mainCTAVisible: layoutRaw.mainCTAVisible ?? false,
    ctaCount: layoutRaw.ctaCount ?? 0,
    ctaTexts: (layoutRaw.ctaTexts ?? []).slice(0, 6),
  };

  // --- Forms ---
  const forms = {
    count: formsRaw.formCount ?? 0,
  };

  // --- Score ---
  const { overall: overallScore, categories: categoryScores } = computeCategoryScores(
    healthRaw,
    perfRaw,
    layoutRaw,
    navRaw,
  );
  const grade = gradeFromScore(overallScore);

  // --- Findings (enriched with continuous scores) ---
  const findings = [];
  const opportunities = [];

  // Health findings
  if (!health.ok)
    findings.push({
      type: 'critical',
      message: `Page returned HTTP ${health.status} — users may not be able to access this page.`,
    });
  if (health.blankScreen)
    findings.push({
      type: 'critical',
      message: 'Blank screen detected — page may be completely broken.',
    });
  if (health.significantErrors > 0)
    findings.push({
      type: 'warning',
      message: `${health.significantErrors} significant console error(s) detected.`,
    });
  if (health.failedRequests > 10)
    findings.push({
      type: 'critical',
      message: `${health.failedRequests} failed network request(s) — significant reliability issue.`,
    });
  else if (health.failedRequests > 3)
    findings.push({
      type: 'warning',
      message: `${health.failedRequests} failed network request(s).`,
    });

  // Speed findings — continuous thresholds give more nuanced messages
  if (fcpMs && fcpMs >= 3000)
    findings.push({
      type: 'critical',
      message: `Very slow first paint (${msToSeconds(fcpMs)}) — users may abandon.`,
    });
  else if (fcpMs && fcpMs >= 1800)
    findings.push({
      type: 'warning',
      message: `Moderate page paint time (${msToSeconds(fcpMs)}) — room for improvement.`,
    });
  else if (fcpMs && fcpMs < 1000)
    findings.push({ type: 'success', message: `Excellent first paint (${msToSeconds(fcpMs)}).` });
  else if (fcpMs)
    findings.push({ type: 'success', message: `Good first paint (${msToSeconds(fcpMs)}).` });

  if (ttfbMs && ttfbMs >= 800)
    findings.push({
      type: 'critical',
      message: `Slow server response (${msToSeconds(ttfbMs)} TTFB) — needs server-side optimisation.`,
    });
  else if (ttfbMs && ttfbMs >= 400)
    findings.push({
      type: 'warning',
      message: `Server response time could improve (${msToSeconds(ttfbMs)} TTFB).`,
    });

  if (totalMs && totalMs >= 7000)
    findings.push({
      type: 'critical',
      message: `Page takes ${msToSeconds(totalMs)} to fully load — severe UX impact.`,
    });
  else if (totalMs && totalMs >= 5000)
    findings.push({
      type: 'warning',
      message: `Total load time ${msToSeconds(totalMs)} — noticeably slow.`,
    });
  else if (totalMs && totalMs >= 3500)
    findings.push({
      type: 'info',
      message: `Load time ${msToSeconds(totalMs)} — acceptable but improvable.`,
    });

  if (dclMs && dclMs >= 2500)
    findings.push({
      type: 'warning',
      message: `DOM ready at ${msToSeconds(dclMs)} — interactive content delayed.`,
    });

  // Resource findings
  const slowResCount = (perfRaw.slowResources ?? []).length;
  if (slowResCount >= 4)
    findings.push({
      type: 'critical',
      message: `${slowResCount} slow-loading resources dragging down page speed.`,
    });
  else if (slowResCount >= 2)
    findings.push({
      type: 'warning',
      message: `${slowResCount} resources loading slowly (>1s each).`,
    });

  if (performance.totalResourceSizeKB > 1000)
    findings.push({
      type: 'critical',
      message: `Heavy page weight (${performance.totalResourceSizeKB} KB) — compress assets.`,
    });
  else if (performance.totalResourceSizeKB > 500)
    findings.push({
      type: 'warning',
      message: `Page weight ${performance.totalResourceSizeKB} KB could be reduced.`,
    });

  if (performance.totalResources > 60)
    findings.push({
      type: 'warning',
      message: `${performance.totalResources} total resources loaded — consider consolidation.`,
    });

  // Mobile/responsive findings
  if (resp.mobile && !resp.mobile.responsive)
    findings.push({
      type: 'critical',
      message: "Not mobile-responsive — failing on 60%+ of today's traffic.",
    });
  if (resp.tablet && !resp.tablet.responsive)
    findings.push({ type: 'warning', message: 'Tablet responsiveness issues.' });
  if (resp.mobile?.responsive && !resp.mobile?.hasHorizontalScroll)
    findings.push({ type: 'success', message: 'Fully mobile-responsive.' });

  // Navigation findings
  if (navRaw.brokenLinks?.length > 0)
    findings.push({
      type: 'critical',
      message: `${navRaw.brokenLinks.length} broken link(s) — damages SEO.`,
    });
  if ((navRaw.navigationIssues ?? []).length >= 5)
    findings.push({
      type: 'warning',
      message: `${navRaw.navigationIssues.length} navigation issues — poor link structure.`,
    });
  else if ((navRaw.navigationIssues ?? []).length > 0)
    findings.push({
      type: 'info',
      message: `${navRaw.navigationIssues.length} minor navigation issue(s).`,
    });

  // Layout/UX findings
  if (!layout.headerVisible && !layout.footerVisible)
    findings.push({
      type: 'critical',
      message: 'Missing both header and footer — incomplete page structure.',
    });
  else if (!layout.headerVisible)
    findings.push({ type: 'warning', message: 'No visible header/navigation.' });
  else if (!layout.footerVisible) findings.push({ type: 'info', message: 'No visible footer.' });
  if (layout.ctaCount === 0)
    findings.push({ type: 'warning', message: 'No CTAs detected — missed conversions.' });
  else
    findings.push({
      type: 'success',
      message: `${layout.ctaCount} CTA(s): ${layout.ctaTexts.slice(0, 3).join(', ')}`,
    });
  if (!layout.logoDetected) findings.push({ type: 'info', message: 'No logo detected on page.' });

  // Positive summary if no issues
  if (findings.filter((f) => f.type === 'critical' || f.type === 'warning').length === 0)
    findings.push({ type: 'success', message: 'No critical issues on this page.' });

  // Opportunities — prioritised by impact
  if (performance.totalResourceSizeKB > 500)
    opportunities.push(
      `Reduce page weight (${performance.totalResourceSizeKB} KB) — compress images, minify JS/CSS.`,
    );
  if (slowResCount > 0)
    opportunities.push(
      `Optimise ${slowResCount} slow resource(s) — lazy-load or defer non-critical assets.`,
    );
  if (!resp.mobile?.responsive)
    opportunities.push('Implement responsive CSS for mobile devices (375px breakpoint).');
  if (layout.ctaCount === 0)
    opportunities.push('Add clear call-to-action buttons to drive engagement.');
  if ((navRaw.navigationIssues ?? []).length > 0)
    opportunities.push('Fix anchor-based navigation links for better UX.');
  if (health.failedRequests > 3)
    opportunities.push(`Resolve ${health.failedRequests} failed network requests.`);
  if (ttfbMs && ttfbMs >= 400)
    opportunities.push('Optimise server response time — consider caching, CDN, or edge computing.');
  if (totalMs && totalMs >= 5000)
    opportunities.push(`Cut load time from ${msToSeconds(totalMs)} — target under 3s.`);
  if (performance.totalResources > 50)
    opportunities.push(
      `Reduce ${performance.totalResources} network requests — bundle & tree-shake.`,
    );
  if (!layout.headerVisible || !layout.footerVisible)
    opportunities.push('Add consistent header/footer navigation across all pages.');

  return {
    url,
    slug,
    overallScore,
    grade,
    categoryScores,
    health,
    performance,
    responsiveness,
    navigation,
    layout,
    forms,
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
  const mobilePassCount = pages.filter((p) => p.responsiveness.mobile.score === 100).length;
  const allOpportunities = [...new Set(pages.flatMap((p) => p.opportunities))];

  const pagesWithFCP = pages.filter((p) => p.performance.firstContentfulPaint.ms);
  const avgFcp = pagesWithFCP.length
    ? Math.round(
        pagesWithFCP.reduce((a, p) => a + p.performance.firstContentfulPaint.ms, 0) /
          pagesWithFCP.length,
      )
    : null;
  const pagesWithTTFB = pages.filter((p) => p.performance.timeToFirstByte.ms);
  const avgTtfb = pagesWithTTFB.length
    ? Math.round(
        pagesWithTTFB.reduce((a, p) => a + p.performance.timeToFirstByte.ms, 0) /
          pagesWithTTFB.length,
      )
    : null;
  const pagesWithLoad = pages.filter((p) => p.performance.totalLoadTime.ms);
  const avgLoadTime = pagesWithLoad.length
    ? Math.round(
        pagesWithLoad.reduce((a, p) => a + p.performance.totalLoadTime.ms, 0) /
          pagesWithLoad.length,
      )
    : null;

  const totalBrokenLinks = pages.reduce((a, p) => a + (p.navigation.brokenLinks?.length ?? 0), 0);
  const totalLinks = pages.reduce((a, p) => a + p.navigation.totalLinks, 0);
  const httpOkCount = pages.filter((p) => p.health.ok).length;
  const totalCTAs = pages.reduce((a, p) => a + p.layout.ctaCount, 0);
  const headerVisibleCount = pages.filter((p) => p.layout.headerVisible).length;
  const footerVisibleCount = pages.filter((p) => p.layout.footerVisible).length;
  const logoCount = pages.filter((p) => p.layout.logoDetected).length;

  const sortedByScore = [...pages].sort((a, b) => a.overallScore - b.overallScore);
  const worstPages = sortedByScore
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, score: p.overallScore, grade: p.grade }));
  const bestPages = sortedByScore
    .slice(-3)
    .reverse()
    .map((p) => ({ slug: p.slug, score: p.overallScore, grade: p.grade }));

  const topFindings = [];
  if (criticalCount > 0)
    topFindings.push(`${criticalCount} critical issue(s) across ${pages.length} pages`);
  if (mobileFailCount > 0)
    topFindings.push(`${mobileFailCount} of ${pages.length} pages not mobile-ready`);
  if (totalBrokenLinks > 0) topFindings.push(`${totalBrokenLinks} broken link(s)`);
  if (warningCount > 0) topFindings.push(`${warningCount} warning(s) flagged`);
  if (topFindings.length === 0) topFindings.push('No critical issues detected');

  return {
    pagesAudited: pages.length,
    averageScore: avgScore,
    grade,
    criticalIssues: criticalCount,
    warnings: warningCount,
    mobileFailures: mobileFailCount,
    mobilePassCount,
    httpOkCount,
    totalLinks,
    totalBrokenLinks,
    totalCTAs,
    headerVisibleCount,
    footerVisibleCount,
    logoCount,
    averageFirstContentfulPaint: {
      ms: avgFcp,
      formatted: msToSeconds(avgFcp),
      grade: fcpGrade(avgFcp),
    },
    averageTTFB: { ms: avgTtfb, formatted: msToSeconds(avgTtfb), grade: ttfbGrade(avgTtfb) },
    averageLoadTime: {
      ms: avgLoadTime,
      formatted: msToSeconds(avgLoadTime),
      grade: loadTimeGrade(avgLoadTime),
    },
    topFindings,
    allOpportunities,
    worstPages,
    bestPages,
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
        summary.averageScore >= 75
          ? `Your site scores ${summary.averageScore}/100 — a solid foundation with clear wins available.`
          : `Your site scores ${summary.averageScore}/100 — meaningful improvements available.`,
      overallScore: summary.averageScore,
      grade: summary.grade,
      keyStats: [
        { label: 'Pages Audited', value: summary.pagesAudited, icon: 'PA' },
        {
          label: 'Critical Issues',
          value: summary.criticalIssues,
          icon: 'CI',
          highlight: summary.criticalIssues > 0,
        },
        { label: 'Warnings', value: summary.warnings, icon: 'WN' },
        {
          label: 'Mobile Failures',
          value: summary.mobileFailures,
          icon: 'MF',
          highlight: summary.mobileFailures > 0,
        },
        {
          label: 'Avg. FCP',
          value: summary.averageFirstContentfulPaint.formatted ?? 'N/A',
          icon: 'FCP',
          subLabel: summary.averageFirstContentfulPaint.grade?.label,
        },
      ],
      performanceStats: {
        avgFCP: summary.averageFirstContentfulPaint,
        avgTTFB: summary.averageTTFB,
        avgLoadTime: summary.averageLoadTime,
      },
      siteHealth: {
        httpOkCount: summary.httpOkCount,
        totalPages: summary.pagesAudited,
        totalLinks: summary.totalLinks,
        brokenLinks: summary.totalBrokenLinks,
        totalCTAs: summary.totalCTAs,
        headerFound: summary.headerVisibleCount,
        footerFound: summary.footerVisibleCount,
        logoFound: summary.logoCount,
        mobilePass: summary.mobilePassCount,
        mobileFail: summary.mobileFailures,
      },
      topFindings: summary.topFindings,
      worstPages: summary.worstPages,
      bestPages: summary.bestPages,
      callToAction:
        'The issues identified are actionable improvements that can increase search rankings, improve user experience, and drive more conversions.',
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
          description: 'HTTP status, console errors, failed requests, and reliability',
          score: Math.round(
            transformed.reduce((a, p) => a + p.categoryScores.health, 0) / transformed.length,
          ),
        },
        {
          name: 'Page Speed',
          description: 'First Contentful Paint, TTFB, DOM ready, and total load time',
          score: Math.round(
            transformed.reduce((a, p) => a + p.categoryScores.speed, 0) / transformed.length,
          ),
        },
        {
          name: 'Resource Efficiency',
          description: 'Page weight, resource count, slow assets, and image optimisation',
          score: Math.round(
            transformed.reduce((a, p) => a + p.categoryScores.resources, 0) / transformed.length,
          ),
        },
        {
          name: 'Mobile Experience',
          description: 'Responsiveness across mobile, tablet, and desktop viewports',
          score: Math.round(
            transformed.reduce((a, p) => a + p.categoryScores.mobile, 0) / transformed.length,
          ),
        },
        {
          name: 'Navigation & Links',
          description: 'Broken links, anchor integrity, and navigation health',
          score: Math.round(
            transformed.reduce((a, p) => a + p.categoryScores.navigation, 0) / transformed.length,
          ),
        },
        {
          name: 'Layout & UX',
          description: 'Header, footer, logo, CTAs, and page structure completeness',
          score: Math.round(
            transformed.reduce((a, p) => a + p.categoryScores.layout, 0) / transformed.length,
          ),
        },
      ].map((c) => ({ ...c, grade: gradeFromScore(c.score) })),
    },
  };
}

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: npm run report <input.json>');
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

// Print score distribution for verification
const scores = report.pageBreakdown.map((p) => p.overallScore).sort((a, b) => a - b);
console.log(
  `📈  Score range: ${scores[0]}–${scores[scores.length - 1]} | Spread: ${scores[scores.length - 1] - scores[0]} pts`,
);
console.log(`    Scores: ${scores.join(', ')}`);
