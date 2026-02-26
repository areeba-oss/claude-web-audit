/**
 * pages.js — Full-page HTML sections: cover, executive summary,
 *            scorecard, opportunities, page breakdown, closing.
 */

const { scoreRing, categoryBar, pageCard, pageHeaderBar, pageFooterBar } = require('./components');

// ─── Cover Page ──────────────────────────────────────────────────────────────

function coverPage(meta, executiveSummary, generatedDate) {
  const gradeColor = executiveSummary.grade.color;

  const statCards = executiveSummary.keyStats
    .map(
      (stat) => `
    <div class="cover-stat ${stat.highlight ? 'highlight' : ''}">
      <span class="c-stat-icon">${stat.icon}</span>
      <span class="c-stat-val">${stat.value}</span>
      <span class="c-stat-lab">${stat.label}</span>
      ${stat.subLabel ? `<span class="c-stat-sub">${stat.subLabel}</span>` : ''}
    </div>`,
    )
    .join('');

  const findingPills = executiveSummary.topFindings
    .map((f) => `<div class="cover-finding-pill">${f}</div>`)
    .join('');

  return `
<div class="pdf-page cover-page">
  <div class="cover-accent-bar"></div>
  <div class="cover-body">

    <div class="cover-header">
      <span class="agency-name">${meta.tool}</span>
      <span class="cover-meta-tag">CONFIDENTIAL — ${generatedDate}</span>
    </div>

    <div class="cover-main">
      <div class="cover-eyebrow">Website Performance Audit</div>
      <h1 class="cover-title">
        Site Performance<br/><span>Audit Report</span>
      </h1>
      <div class="cover-domain font-mono">${meta.domain}</div>

      <div class="cover-score-row">
        <div class="cover-score-ring">${scoreRing(executiveSummary.overallScore, 100)}</div>
        <div class="cover-score-text">
          <div class="score-num" style="color:${gradeColor}">${executiveSummary.overallScore}</div>
          <div class="score-grade" style="color:${gradeColor}">${executiveSummary.grade.grade} — ${executiveSummary.grade.label}</div>
          <div class="score-label">Overall Score / 100</div>
        </div>
      </div>
    </div>

    <div class="cover-stats-row">${statCards}</div>
    <div class="cover-findings">${findingPills}</div>

    <div class="cover-cta-box">
      <div class="cover-cta-title">What This Report Means For Your Business</div>
      <div class="cover-cta-body">${executiveSummary.callToAction}</div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-left">${meta.tool} v${meta.version} · ${meta.auditedPages} pages audited</div>
      <div class="cover-footer-right">Generated ${generatedDate}</div>
    </div>
  </div>
</div>`;
}

// ─── Executive Summary Page ──────────────────────────────────────────────────

function executiveSummaryPage(meta, summary, generatedDate) {
  const { siteHealth, performanceStats, worstPages, bestPages } = summary;

  const statItems = [
    {
      icon: 'HTTP',
      val: siteHealth.httpOkCount + '/' + siteHealth.totalPages,
      label: 'Pages OK',
      sub: '',
    },
    {
      icon: 'FCP',
      val: performanceStats.avgFCP.formatted ?? 'N/A',
      label: 'Avg FCP',
      sub: performanceStats.avgFCP.grade?.label || '',
    },
    {
      icon: 'LNK',
      val: siteHealth.totalLinks,
      label: 'Total Links',
      sub: siteHealth.brokenLinks > 0 ? siteHealth.brokenLinks + ' broken' : 'All healthy',
    },
    {
      icon: 'MOB',
      val: siteHealth.mobilePass + '/' + siteHealth.totalPages,
      label: 'Mobile-Ready',
      sub: siteHealth.mobileFail > 0 ? siteHealth.mobileFail + ' failing' : '',
    },
    { icon: 'CTA', val: siteHealth.totalCTAs, label: 'CTAs Found', sub: '' },
    {
      icon: 'TTFB',
      val: performanceStats.avgTTFB.formatted ?? 'N/A',
      label: 'Avg TTFB',
      sub: performanceStats.avgTTFB.grade?.label || '',
    },
    {
      icon: 'LOAD',
      val: performanceStats.avgLoadTime.formatted ?? 'N/A',
      label: 'Avg Load Time',
      sub: performanceStats.avgLoadTime.grade?.label || '',
    },
    {
      icon: 'HDR',
      val: siteHealth.headerFound + '/' + siteHealth.totalPages,
      label: 'Header Visible',
      sub: '',
    },
  ];

  const statsHTML = statItems
    .map(
      (s) => `
    <div class="exec-stat-card">
      <span class="esc-icon">${s.icon}</span>
      <div>
        <div class="esc-val">${s.val}</div>
        <div class="esc-label">${s.label}</div>
        ${s.sub ? `<div class="esc-sub" style="color: ${s.sub.includes('broken') || s.sub.includes('failing') ? 'var(--red)' : 'var(--green)'}">${s.sub}</div>` : ''}
      </div>
    </div>`,
    )
    .join('');

  const bestHTML = (bestPages || [])
    .map(
      (p) => `
    <div class="bw-item best">
      <span class="bw-slug">${p.slug}</span>
      <span class="bw-score" style="color:${p.grade.color}">${p.score}</span>
    </div>`,
    )
    .join('');

  const worstHTML = (worstPages || [])
    .map(
      (p) => `
    <div class="bw-item worst">
      <span class="bw-slug">${p.slug}</span>
      <span class="bw-score" style="color:${p.grade.color}">${p.score}</span>
    </div>`,
    )
    .join('');

  return `
<div class="pdf-page">
  ${pageHeaderBar(meta.tool, meta.domain, generatedDate)}
  <div class="section-header">
    <div class="section-eyebrow">Executive Summary</div>
    <h2 class="section-title">Your Site at a Glance</h2>
    <p class="section-sub">Key metrics aggregated from ${meta.auditedPages} audited pages</p>
  </div>
  <div class="exec-summary-body">
    <p class="exec-headline">${summary.headline}</p>
    <div class="exec-grid">${statsHTML}</div>
    <div class="best-worst-row">
      <div>
        <div class="bw-col-title">Top Performing Pages</div>
        ${bestHTML}
      </div>
      <div>
        <div class="bw-col-title">Pages Needing Attention</div>
        ${worstHTML}
      </div>
    </div>
  </div>
  ${pageFooterBar(meta.tool, meta.version, 'Executive Summary')}
</div>`;
}

// ─── Scorecard Page ──────────────────────────────────────────────────────────

function scorecardPage(meta, categoryScorecard, generatedDate) {
  const categories = categoryScorecard.categories
    .map((c) => categoryBar(c.name, c.description, c.score, c.grade))
    .join('');

  return `
<div class="pdf-page">
  ${pageHeaderBar(meta.tool, meta.domain, generatedDate)}
  <div class="section-header">
    <div class="section-eyebrow">Performance Overview</div>
    <h2 class="section-title">${categoryScorecard.title}</h2>
    <p class="section-sub">Scored across ${categoryScorecard.categories.length} core categories from ${meta.auditedPages} audited pages</p>
  </div>
  <div class="scorecard-body">
    ${categories}
  </div>
  ${pageFooterBar(meta.tool, meta.version, 'Category Scorecard')}
</div>`;
}

// ─── Opportunities Page ──────────────────────────────────────────────────────

function opportunitiesPage(meta, opportunitySummary, generatedDate) {
  const MAX_ITEMS = 10;
  const allItems = opportunitySummary.items || [];
  const visible = allItems.slice(0, MAX_ITEMS);
  const remaining = allItems.length - visible.length;

  const items = visible
    .map(
      (item) => `
    <div class="opp-summary-item">
      <span class="opp-num">${String(item.id).padStart(2, '0')}</span>
      <div class="opp-content">
        <span class="opp-text">${item.opportunity}</span>
      </div>
    </div>`,
    )
    .join('');

  const overflowNote =
    remaining > 0
      ? `<div class="opp-overflow">+ ${remaining} more opportunit${remaining === 1 ? 'y' : 'ies'} identified — see page-by-page breakdown for full details</div>`
      : '';

  return `
<div class="pdf-page">
  ${pageHeaderBar(meta.tool, meta.domain, generatedDate)}
  <div class="section-header">
    <div class="section-eyebrow">Quick Wins</div>
    <h2 class="section-title">${opportunitySummary.title}</h2>
    <p class="section-sub">${opportunitySummary.description}</p>
  </div>
  <div class="opp-section-body">
    <div class="opp-summary-list">
      ${items}
    </div>
    ${overflowNote}
  </div>
  ${pageFooterBar(meta.tool, meta.version, 'Growth Opportunities')}
</div>`;
}

// ─── Page Breakdown Pages ────────────────────────────────────────────────────
//  Groups page cards into PDF pages (2 per page for compact layout).

function pageBreakdownPages(meta, pageBreakdown, generatedDate) {
  const CARDS_PER_PAGE = 2;
  const chunks = [];

  for (let i = 0; i < pageBreakdown.length; i += CARDS_PER_PAGE) {
    chunks.push(pageBreakdown.slice(i, i + CARDS_PER_PAGE));
  }

  return chunks
    .map((chunk, ci) => {
      const cards = chunk.map((page, j) => pageCard(page, ci * CARDS_PER_PAGE + j)).join('');
      const pageNum = `Pages ${ci * CARDS_PER_PAGE + 1}–${Math.min((ci + 1) * CARDS_PER_PAGE, pageBreakdown.length)} of ${pageBreakdown.length}`;

      return `
<div class="pdf-page">
  ${pageHeaderBar(meta.tool, meta.domain, generatedDate)}
  <div class="section-header">
    <div class="section-eyebrow">Detailed Analysis</div>
    <h2 class="section-title">Page-by-Page Breakdown</h2>
    <p class="section-sub">${pageNum}</p>
  </div>
  <div class="pages-body">
    ${cards}
  </div>
  ${pageFooterBar(meta.tool, meta.version, pageNum)}
</div>`;
    })
    .join('\n');
}

// ─── Closing Page ────────────────────────────────────────────────────────────

function closingPage(meta, executiveSummary) {
  const criticals = executiveSummary.keyStats[1]?.value ?? 0;
  const warnings = executiveSummary.keyStats[2]?.value ?? 0;
  const mobileIssues = executiveSummary.keyStats[3]?.value ?? 0;
  const score = executiveSummary.overallScore;
  const grade = executiveSummary.grade;

  return `
<div class="pdf-page closing-page">
  <div class="cover-accent-bar"></div>
  <div class="closing-body-wrap">
    <div class="closing-eyebrow">Ready to Fix This?</div>
    <h2 class="closing-title">Let's Turn These<br/><span>Findings Into Wins</span></h2>
    <p class="closing-body">
      This audit analysed <strong>${meta.auditedPages} pages</strong> of
      <strong>${meta.domain}</strong> and identified
      <strong>${criticals} critical issues</strong> and
      <strong>${warnings} warnings</strong>.
      Each one is a measurable drag on your search rankings, user experience, and conversions.
      The good news? Every issue here has a clear, actionable fix.
    </p>

    <div class="closing-summary-row">
      <div class="closing-summary-card">
        <div class="closing-summary-val" style="color:${grade.color}">${score}<span>/100</span></div>
        <div class="closing-summary-lab">Overall Score — ${grade.grade} (${grade.label})</div>
      </div>
      <div class="closing-summary-card">
        <div class="closing-summary-val" style="color:var(--red)">${criticals}</div>
        <div class="closing-summary-lab">Critical Issues</div>
      </div>
      <div class="closing-summary-card">
        <div class="closing-summary-val" style="color:var(--yellow)">${warnings}</div>
        <div class="closing-summary-lab">Warnings</div>
      </div>
      <div class="closing-summary-card">
        <div class="closing-summary-val" style="color:var(--red)">${mobileIssues}</div>
        <div class="closing-summary-lab">Mobile Failures</div>
      </div>
    </div>

    <div class="closing-section-label">What We Can Fix For You</div>
    <div class="closing-bullets">
      <div class="closing-bullet">Mobile responsiveness fixes — capture the 60%+ mobile audience you're currently losing</div>
      <div class="closing-bullet">Page speed optimisations — reduce load times, bounce rates, and improve Core Web Vitals</div>
      <div class="closing-bullet">Broken link and navigation repairs — protect your SEO authority and search rankings</div>
      <div class="closing-bullet">Layout and UX improvements — ensure headers, footers, and CTAs are visible and effective</div>
      <div class="closing-bullet">Console error remediation — eliminate JavaScript errors that affect functionality</div>
      <div class="closing-bullet">CTA strategy and placement — turn passive visitors into leads and customers</div>
    </div>
    <div class="closing-cta-card">
      <div class="closing-cta-title">Start With a Free Strategy Call</div>
      <div class="closing-cta-body">
        Our team will walk you through the priority fixes for
        <strong>${meta.domain}</strong>, provide accurate effort estimates,
        and show you exactly how we'd approach each issue.
        No obligation — just a clear picture of what's possible.
      </div>
    </div>
  </div>
  <div class="closing-accent-bar"></div>
</div>`;
}

module.exports = {
  coverPage,
  executiveSummaryPage,
  scorecardPage,
  opportunitiesPage,
  pageBreakdownPages,
  closingPage,
};
