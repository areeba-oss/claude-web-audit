// navigationLinksAudit.js — uses pre-validated link data from main.js, AI from shared result

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

// navigationLinksAuditReduced.js — reduced, client-ready audit report

async function navigationLinksAuditReduced(page, url, aiResult, linkData) {
    try {
        // Use existing evaluation to extract links
        const { menuLinks, footerLinks, allLinks } = await page.evaluate(() => {
            const getLinks = scope => Array.from(scope.querySelectorAll('a[href]'))
                .map(a => ({ text: a.innerText?.trim().slice(0, 80), href: a.href }))
                .filter(l => l.href && !l.href.startsWith('javascript:'));
            const nav    = document.querySelector('nav,header,[role="navigation"]');
            const footer = document.querySelector('footer,[role="contentinfo"]');
            return { menuLinks: nav ? getLinks(nav) : [], footerLinks: footer ? getLinks(footer) : [], allLinks: getLinks(document) };
        });

        const cache = linkData?.cache || new Map();
        const enrich = links => links.map(l => ({ ...l, ...(cache.get(l.href) || {}) }));

        const enrichedMenu   = enrich(menuLinks);
        const enrichedFooter = enrich(footerLinks);
        const enrichedAll    = enrich(allLinks);

        const ai = aiResult?.links || {};
        const genuinelyBroken = ai.genuinelyBroken || (linkData?.broken || []).filter(l => l.status === 404 || l.status >= 500);
        const falsePositives  = ai.falsePositives || (linkData?.broken || []).filter(l => l.status === 401 || l.status === 403);

        // Filter only problematic links for navigation
        const navigationIssues = enrichedMenu
            .concat(enrichedFooter)
            .filter(l => !l.ok)
            .map(l => ({
                text: l.text || '(no text)',
                url: l.href,
                issue: l.status ? `HTTP ${l.status}` : 'Unknown issue'
            }));

        // Protected / expected auth links
        const protectedLinks = falsePositives.map(l => l.url);

        // Metrics
        const internalLinks = linkData?.internal?.length || 0;
        const externalLinks = linkData?.external?.length || 0;
        const totalLinks    = internalLinks + externalLinks;

        return {
            url,
            navigationHealth: navigationIssues.length ? 'issues' : 'good',
            severity: ai.severity || 'none',

            metrics: {
                totalLinks,
                internalLinks,
                externalLinks,
                brokenLinks: genuinelyBroken.length,
                protectedLinks: protectedLinks.length
            },

            navigationIssues,   // only links with problems
            brokenLinks: genuinelyBroken.map(l => ({ url: l.url, location: l.location || 'page', status: l.status })),
            protectedLinks,
            insight: ai.summary || 'All navigation links are functional and properly structured.'
        };
    } catch (err) {
        return { url, fatalError: err.message };
    }
}

module.exports = navigationLinksAuditReduced;

// module.exports = navigationLinksAudit;
