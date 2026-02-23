// navigationLinksAudit.js — uses pre-validated link data from main.js, AI from shared result

function classifyHref(href, pageUrl) {
    try {
        const u = new URL(href), o = new URL(pageUrl).origin;
        if (!['http:','https:'].includes(u.protocol)) return u.protocol === 'mailto:' ? 'mailto' : u.protocol === 'tel:' ? 'tel' : 'unknown';
        if (u.hash && u.origin === o && u.pathname === new URL(pageUrl).pathname) return 'anchor';
        return u.origin === o ? 'internal' : 'external';
    } catch { return href.startsWith('#') ? 'anchor' : href.startsWith('mailto:') ? 'mailto' : href.startsWith('tel:') ? 'tel' : 'unknown'; }
}

async function navigationLinksAudit(page, url, aiResult, linkData) {
    try {
        const { menuLinks, footerLinks, allLinks } = await page.evaluate(() => {
            const getLinks = scope => Array.from(scope.querySelectorAll('a[href]'))
                .map(a => ({ text: a.innerText?.trim().slice(0, 80), href: a.href }))
                .filter(l => l.href && !l.href.startsWith('javascript:'));
            const nav    = document.querySelector('nav,header,[role="navigation"]');
            const footer = document.querySelector('footer,[role="contentinfo"]');
            return { menuLinks: nav ? getLinks(nav) : [], footerLinks: footer ? getLinks(footer) : [], allLinks: getLinks(document) };
        });

        // Use pre-validated cache from main.js (already computed in parallel with AI call)
        const cache  = linkData?.cache  || new Map();
        const enrich = links => links.map(l => ({ ...l, ...(cache.get(l.href) || {}) }));

        const enrichedAll    = enrich(allLinks);
        const enrichedMenu   = enrich(menuLinks);
        const enrichedFooter = enrich(footerLinks);

        const ai = aiResult?.links || {};
        const genuinelyBroken = ai.genuinelyBroken || (linkData?.broken || []).filter(l => l.status === 404 || (l.status >= 500));
        const falsePositives  = ai.falsePositives  || (linkData?.broken || []).filter(l => l.status === 401 || l.status === 403);

        return {
            url,
            menuLinks:       enrichedMenu,
            footerLinks:     enrichedFooter,
            allLinks:        enrichedAll,
            genuinelyBroken,
            falsePositives,
            aiSeverity:      ai.severity || 'unknown',
            aiSummary:       ai.summary  || null,
            detectionMethod: aiResult?.method || 'fallback',
            summary: {
                menuLinksBroken:   enrichedMenu.filter(l => !l.ok).length,
                footerLinksBroken: enrichedFooter.filter(l => !l.ok).length,
                internalTotal:     (linkData?.internal || []).length,
                externalTotal:     (linkData?.external || []).length,
                genuinelyBroken:   genuinelyBroken.length,
                falsePositives:    falsePositives.length
            }
        };
    } catch (err) {
        return { url, fatalError: err.message };
    }
}

module.exports = navigationLinksAudit;
