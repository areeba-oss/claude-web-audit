// basicHealthCheck.js — reads from shared aiResult, no direct AI call

async function basicHealthCheck(page, url, { httpStatus, consoleErrors, consoleWarnings, failedRequests }, aiResult) {
    const ai = aiResult?.health || {};
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '').catch(() => '');

    return {
        url,
        httpStatus,
        httpOk:               httpStatus >= 200 && httpStatus < 400,
        blankScreen:          bodyText.length < 50,
        aiHealthScore:        ai.overallScore       || 'unknown',
        aiHealthSummary:      ai.summary            || null,
        significantErrors:    ai.significantErrors  || consoleErrors,
        significantWarnings:  consoleWarnings,
        criticalFailedReqs:   ai.criticalFailedRequests || failedRequests,
        ignoredNoise:         ai.ignoredNoise       || [],
        consoleErrorCount:    consoleErrors.length,
        significantErrorCount:(ai.significantErrors || []).length,
        failedRequestCount:   failedRequests.length,
        criticalFailedCount:  (ai.criticalFailedRequests || []).length,
        detectionMethod:      aiResult?.method      || 'fallback'
    };
}

module.exports = basicHealthCheck;
