// performanceAudit.js — metrics from pre-computed perfRaw, AI from shared result

async function performanceAudit(page, url, aiResult, perfRaw) {
  try {
    // Use pre-computed perf data from main.js if available
    const timing =
      perfRaw ||
      (await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const resources = performance.getEntriesByType('resource').map((r) => ({
          url: r.name,
          type: r.initiatorType,
          durationMs: Math.round(r.duration),
          sizeKB: r.transferSize ? Math.round(r.transferSize / 1024) : null,
        }));
        const summary = resources.reduce((acc, r) => {
          if (!acc[r.type]) acc[r.type] = { count: 0, totalMs: 0, totalKB: 0 };
          acc[r.type].count++;
          acc[r.type].totalMs += r.durationMs;
          if (r.sizeKB) acc[r.type].totalKB += r.sizeKB;
          return acc;
        }, {});
        return {
          fcp: fcp ? Math.round(fcp.startTime) : null,
          dcl: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
          loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
          ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
          slowResources: resources.filter((r) => r.durationMs > 1000),
          largeImages: resources.filter(
            (r) => r.type === 'img' && (r.sizeKB > 200 || r.durationMs > 500),
          ),
          resourceSummary: summary,
        };
      }));

    const ai = aiResult?.performance || {};
    const rawScore =
      (timing.fcp ?? 9999) > 3000
        ? 'poor'
        : (timing.fcp ?? 9999) > 1800
          ? 'needs-improvement'
          : 'good';

    return {
      url,
      firstContentfulPaint: timing.fcp,
      domContentLoaded: timing.dcl,
      totalLoadTime: timing.loadTime,
      timeToFirstByte: timing.ttfb,
      resourceSummary: timing.resourceSummary,
      slowResources: timing.slowResources,
      largeImages: timing.largeImages,
      performanceScore: ai.overallScore || rawScore,
      fcpAssessment: ai.fcpAssessment || rawScore,
      ttfbAssessment: ai.ttfbAssessment || null,
      topIssues: ai.topIssues || [],
      recommendations: ai.recommendations || [],
      userImpact: ai.userImpact || null,
      detectionMethod: aiResult?.method || 'fallback',
    };
  } catch (err) {
    return { url, fatalError: err.message };
  }
}

module.exports = performanceAudit;
