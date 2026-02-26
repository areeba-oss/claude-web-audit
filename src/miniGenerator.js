/**
 * miniGenerator.js — Compact 3–4 page audit summary report.
 * Reads the same report.json as the full generator, outputs a shorter PDF.
 *
 * Usage: node src/miniGenerator.js report.json
 */

const fs = require('fs');

const { getStyles } = require('./generators/styles');
const {
  scoreRing,
  gradeBadge,
  categoryBar,
  pageHeaderBar,
  pageFooterBar,
} = require('./generators/components');
const { convertToPDF } = require('./generators/pdfConverter');

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node src/miniGenerator.js <input.json>');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(`report-json/${inputPath}`, 'utf8'));

// ─── Mini Styles (extends base) ─────────────────────────────────────────────

function getMiniStyles() {
  return `
    /* ── Mini-specific overrides ── */
    .mini-cover { padding: 12mm 14mm; }

    .mini-cover-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8mm;
    }
    .mini-cover-header .agency {
      font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--accent);
    }
    .mini-cover-header .tag {
      font-size: 8px; color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    .mini-hero {
      text-align: center; padding: 14mm 0 10mm;
    }
    .mini-hero .eyebrow {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.25em;
      color: var(--accent); font-weight: 600; margin-bottom: 3mm;
    }
    .mini-hero h1 {
      font-size: 26px; font-weight: 800; line-height: 1.15;
      color: var(--text); margin-bottom: 3mm;
    }
    .mini-hero h1 span { color: var(--accent); }
    .mini-hero .domain {
      font-family: 'DM Mono', monospace; font-size: 12px;
      color: var(--muted); margin-bottom: 8mm;
    }

    .mini-score-block {
      display: flex; align-items: center; justify-content: center;
      gap: 8mm; margin-bottom: 10mm;
    }
    .mini-score-num {
      font-size: 52px; font-weight: 800;
      font-family: 'DM Mono', monospace;
    }
    .mini-score-meta { text-align: left; }
    .mini-score-meta .grade { font-size: 15px; font-weight: 700; }
    .mini-score-meta .label {
      font-size: 10px; color: var(--muted); margin-top: 1mm;
    }

    .mini-stats {
      display: grid; grid-template-columns: repeat(5, 1fr);
      gap: 3mm; margin-bottom: 8mm;
    }
    .mini-stat {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 4px; padding: 3mm; text-align: center;
    }
    .mini-stat .icon {
      font-family: 'DM Mono', monospace; font-size: 10px;
      font-weight: 600; color: var(--accent);
      background: var(--accent-light); border-radius: 3px;
      padding: 1mm 2mm; display: inline-block; margin-bottom: 1.5mm;
    }
    .mini-stat .val {
      font-size: 16px; font-weight: 700; color: var(--text);
      display: block;
    }
    .mini-stat .lab {
      font-size: 7px; color: var(--muted); text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .mini-stat.highlight .val { color: var(--red); }

    .mini-findings-box {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 5px; padding: 4mm 5mm; margin-bottom: 6mm;
    }
    .mini-findings-title {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.15em; color: var(--accent); margin-bottom: 2mm;
    }
    .mini-finding {
      font-size: 10px; color: var(--text-secondary);
      padding: 1.5mm 0; border-bottom: 1px solid var(--border);
    }
    .mini-finding:last-child { border-bottom: none; }

    .mini-cta-box {
      background: linear-gradient(135deg, var(--accent) 0%, #4338ca 100%);
      border-radius: 6px; padding: 5mm 6mm; text-align: center;
    }
    .mini-cta-box .title {
      font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2mm;
    }
    .mini-cta-box .body {
      font-size: 9.5px; color: rgba(255,255,255,0.85); line-height: 1.5;
    }

    /* ── Page 2: Scorecard + Top Pages ── */
    .mini-scorecard { padding: 0 2mm; }
    .mini-scorecard .category-row { margin-bottom: 3mm; }

    .mini-page-table {
      width: 100%; border-collapse: collapse; margin-bottom: 5mm;
    }
    .mini-page-table th {
      font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--muted); font-weight: 600;
      padding: 2mm 3mm; border-bottom: 2px solid var(--border);
      text-align: left;
    }
    .mini-page-table td {
      font-size: 9.5px; padding: 2mm 3mm;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .mini-page-table .score-cell {
      font-family: 'DM Mono', monospace; font-weight: 700; font-size: 11px;
    }
    .mini-page-table .slug-cell {
      font-family: 'DM Mono', monospace; font-size: 9px; color: var(--text);
    }
    .mini-page-table .badge-cell { white-space: nowrap; }

    .mini-section-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.15em; color: var(--accent);
      margin: 5mm 0 3mm; padding-bottom: 1.5mm;
      border-bottom: 2px solid var(--accent);
      display: inline-block;
    }

    .mini-opp-list { padding-left: 5mm; }
    .mini-opp-item {
      font-size: 9.5px; color: var(--text-secondary);
      padding: 1.5mm 0; position: relative; padding-left: 4mm;
    }
    .mini-opp-item::before {
      content: '→';
      position: absolute; left: 0; color: var(--accent); font-weight: 700;
    }

    /* ── Page 3: Closing ── */
    .mini-closing {
      display: flex; flex-direction: column; justify-content: center;
      align-items: center; text-align: center;
      padding: 20mm 16mm; flex: 1;
    }
    .mini-closing .eyebrow {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.25em;
      color: var(--accent); font-weight: 600; margin-bottom: 4mm;
    }
    .mini-closing h2 {
      font-size: 24px; font-weight: 800; line-height: 1.2;
      color: var(--text); margin-bottom: 6mm;
    }
    .mini-closing h2 span { color: var(--accent); }
    .mini-closing .desc {
      font-size: 10.5px; color: var(--text-secondary); line-height: 1.6;
      max-width: 140mm; margin: 0 auto 8mm;
    }
    .mini-closing-stats {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 4mm; margin-bottom: 8mm; width: 100%; max-width: 150mm;
    }
    .mini-closing-stat {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 5px; padding: 3mm;
    }
    .mini-closing-stat .val {
      font-size: 22px; font-weight: 800;
      font-family: 'DM Mono', monospace;
    }
    .mini-closing-stat .lab {
      font-size: 8px; color: var(--muted); text-transform: uppercase;
    }
  `;
}

// ─── Page 1: Cover + Key Stats ──────────────────────────────────────────────

function miniCoverPage(meta, summary, generatedDate) {
  const gradeColor = summary.grade.color;

  const statCards = summary.keyStats
    .map(
      (stat) => `
    <div class="mini-stat ${stat.highlight ? 'highlight' : ''}">
      <span class="icon">${stat.icon}</span>
      <span class="val">${stat.value}</span>
      <span class="lab">${stat.label}</span>
    </div>`,
    )
    .join('');

  const findings = summary.topFindings.map((f) => `<div class="mini-finding">${f}</div>`).join('');

  return `
<div class="pdf-page cover-page mini-cover">
  <div class="cover-accent-bar"></div>

  <div class="mini-cover-header">
    <span class="agency">${meta.tool}</span>
    <span class="tag">CONFIDENTIAL — ${generatedDate}</span>
  </div>

  <div class="mini-hero">
    <div class="eyebrow">Website Performance Audit — Summary</div>
    <h1>Site Audit<br/><span>Summary Report</span></h1>
    <div class="domain">${meta.domain}</div>
  </div>

  <div class="mini-score-block">
    ${scoreRing(summary.overallScore, 110)}
    <div class="mini-score-meta">
      <div class="grade" style="color:${gradeColor}">${summary.grade.grade} — ${summary.grade.label}</div>
      <div class="label">Overall Score — ${summary.overallScore}/100</div>
      <div class="label">${meta.auditedPages} pages audited</div>
    </div>
  </div>

  <div class="mini-stats">${statCards}</div>

  <div class="mini-findings-box">
    <div class="mini-findings-title">Key Findings</div>
    ${findings}
  </div>

  <div class="mini-cta-box">
    <div class="title">What This Means For Your Business</div>
    <div class="body">${summary.callToAction}</div>
  </div>

  <div class="cover-footer" style="margin-top: auto; padding-top: 4mm;">
    <div class="cover-footer-left">${meta.tool} v${meta.version} · ${meta.auditedPages} pages</div>
    <div class="cover-footer-right">${generatedDate}</div>
  </div>
</div>`;
}

// ─── Page 2: Scorecard + Page Table + Opportunities ─────────────────────────

function miniScorecardPage(meta, report, generatedDate) {
  const { categoryScorecard, executiveSummary, opportunitySummary, pageBreakdown } = report;

  const categories = categoryScorecard.categories
    .map((c) => categoryBar(c.name, c.description, c.score, c.grade))
    .join('');

  // Build page score table — show all pages sorted by score
  const sorted = [...pageBreakdown].sort((a, b) => a.overallScore - b.overallScore);
  const tableRows = sorted
    .map(
      (p) => `
    <tr>
      <td class="slug-cell">${p.slug}</td>
      <td class="score-cell" style="color:${p.grade.color}">${p.overallScore}</td>
      <td class="badge-cell">${gradeBadge(p.grade.grade, p.grade.label, p.grade.color)}</td>
    </tr>`,
    )
    .join('');

  const opps = (opportunitySummary.items || [])
    .slice(0, 8)
    .map((item) => `<div class="mini-opp-item">${item.opportunity}</div>`)
    .join('');

  return `
<div class="pdf-page">
  ${pageHeaderBar(meta.tool, meta.domain, generatedDate)}
  <div class="section-header">
    <div class="section-eyebrow">Performance Breakdown</div>
    <h2 class="section-title">Category Scorecard & Page Scores</h2>
    <p class="section-sub">Aggregated from ${meta.auditedPages} audited pages across 6 categories</p>
  </div>
  <div style="padding: 0 10mm; flex: 1; display: flex; flex-direction: column;">
    <div class="mini-scorecard">${categories}</div>

    <div class="mini-section-label">All Pages by Score</div>
    <table class="mini-page-table">
      <thead>
        <tr><th>Page</th><th>Score</th><th>Grade</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    ${
      opps
        ? `
    <div class="mini-section-label">Top Opportunities</div>
    <div class="mini-opp-list">${opps}</div>
    `
        : ''
    }
  </div>
  ${pageFooterBar(meta.tool, meta.version, 'Scorecard & Opportunities')}
</div>`;
}

// ─── Page 3: Closing / CTA ──────────────────────────────────────────────────

function miniClosingPage(meta, summary) {
  const criticals = summary.keyStats[1]?.value ?? 0;
  const warnings = summary.keyStats[2]?.value ?? 0;
  const gradeColor = summary.grade.color;

  return `
<div class="pdf-page closing-page">
  <div class="cover-accent-bar"></div>
  <div class="mini-closing">
    <div class="eyebrow">Next Steps</div>
    <h2>Let's Turn These<br/><span>Findings Into Results</span></h2>
    <p class="desc">
      This summary covers <strong>${meta.auditedPages} pages</strong> of
      <strong>${meta.domain}</strong> — identifying
      <strong>${criticals} critical issues</strong> and
      <strong>${warnings} warnings</strong> that directly impact your search rankings,
      user experience, and conversion rates.
    </p>

    <div class="mini-closing-stats">
      <div class="mini-closing-stat">
        <div class="val" style="color:${gradeColor}">${summary.overallScore}</div>
        <div class="lab">Overall Score</div>
      </div>
      <div class="mini-closing-stat">
        <div class="val" style="color:var(--red)">${criticals}</div>
        <div class="lab">Critical Issues</div>
      </div>
      <div class="mini-closing-stat">
        <div class="val" style="color:var(--yellow)">${warnings}</div>
        <div class="lab">Warnings</div>
      </div>
    </div>

    <div class="mini-cta-box" style="width: 100%; max-width: 160mm;">
      <div class="title">Get Your Free Strategy Call</div>
      <div class="body">
        Our team will walk you through priority fixes for <strong>${meta.domain}</strong>,
        provide effort estimates, and show you exactly how we'd resolve each issue.
        No obligation — just a clear picture of what's possible.
      </div>
    </div>
  </div>
  <div class="closing-accent-bar"></div>
</div>`;
}

// ─── Build HTML ─────────────────────────────────────────────────────────────

function buildMiniHTML(report) {
  const { meta, executiveSummary } = report;
  const generatedDate = new Date(meta.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${meta.reportTitle} — Summary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    ${getStyles()}
    ${getMiniStyles()}
  </style>
</head>
<body>
  ${miniCoverPage(meta, executiveSummary, generatedDate)}
  ${miniScorecardPage(meta, report, generatedDate)}
  ${miniClosingPage(meta, executiveSummary)}
</body>
</html>`;
}

// ─── Write output ────────────────────────────────────────────────────────────

const html = buildMiniHTML(report);
const outFile = 'report-final/report-mini.html';

fs.mkdirSync('report-final', { recursive: true });
fs.writeFileSync(outFile, html);

console.log(`✅  Mini HTML report written to: ${outFile}`);
console.log(`📄  Pages: 3 (Cover + Scorecard + Closing)`);

// Convert to PDF
convertToPDF(html, 'report-final/report-mini.pdf').catch((err) => {
  console.error('Failed to generate mini PDF');
  process.exit(1);
});
