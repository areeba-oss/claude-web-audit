async function navigationLinksAudit(page, url, aiResult, linkData) {
  try {
    // Use existing evaluation to extract links
    const { menuLinks, footerLinks, allLinks } = await page.evaluate(() => {
      const getLinks = (scope) =>
        Array.from(scope.querySelectorAll('a[href]'))
          .map((a) => ({ text: a.innerText?.trim().slice(0, 80), href: a.href }))
          .filter((l) => l.href && !l.href.startsWith('javascript:'));
      const nav = document.querySelector('nav,header,[role="navigation"]');
      const footer = document.querySelector('footer,[role="contentinfo"]');
      return {
        menuLinks: nav ? getLinks(nav) : [],
        footerLinks: footer ? getLinks(footer) : [],
        allLinks: getLinks(document),
      };
    });

    const cache = linkData?.cache || new Map();
    const enrich = (links) => links.map((l) => ({ ...l, ...(cache.get(l.href) || {}) }));

    const enrichedMenu = enrich(menuLinks);
    const enrichedFooter = enrich(footerLinks);
    const enrichedAll = enrich(allLinks);

    const ai = aiResult?.links || {};
    const genuinelyBroken =
      ai.genuinelyBroken ||
      (linkData?.broken || []).filter((l) => l.status === 404 || l.status >= 500);
    const falsePositives =
      ai.falsePositives ||
      (linkData?.broken || []).filter((l) => l.status === 401 || l.status === 403);

    // Filter only problematic links for navigation
    const navigationIssues = enrichedMenu
      .concat(enrichedFooter)
      .filter((l) => !l.ok)
      .map((l) => ({
        text: l.text || '(no text)',
        url: l.href,
        issue: l.status ? `HTTP ${l.status}` : 'Unknown issue',
      }));

    // Protected / expected auth links
    const protectedLinks = falsePositives.map((l) => l.url);

    // Metrics
    const internalLinks = linkData?.internal?.length || 0;
    const externalLinks = linkData?.external?.length || 0;
    const totalLinks = internalLinks + externalLinks;

    return {
      url,
      navigationHealth: navigationIssues.length ? 'issues' : 'good',
      severity: ai.severity || 'none',

      metrics: {
        totalLinks,
        internalLinks,
        externalLinks,
        brokenLinks: genuinelyBroken.length,
        protectedLinks: protectedLinks.length,
      },

      navigationIssues, // only links with problems
      brokenLinks: genuinelyBroken.map((l) => ({
        url: l.url,
        location: l.location || 'page',
        status: l.status,
      })),
      protectedLinks,
      insight: ai.summary || 'All navigation links are functional and properly structured.',
    };
  } catch (err) {
    return { url, fatalError: err.message };
  }
}

module.exports = navigationLinksAudit;
