const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: npm run generate report-json/<input.json>');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(`report-json/${inputPath}`, 'utf8'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreRing(score, size = 80) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90
      ? '#22c55e'
      : score >= 75
        ? '#84cc16'
        : score >= 60
          ? '#f59e0b'
          : score >= 40
            ? '#f97316'
            : '#ef4444';
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="score-ring">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="6"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central"
        fill="${color}" font-size="${size * 0.22}px" font-weight="800" font-family="'DM Mono', monospace">${score}</text>
    </svg>`;
}

function gradeBadge(grade, label, color) {
  return `<span class="grade-badge" style="color:${color}; border-color:${color}20; background:${color}12">${grade} <span class="grade-label">${label}</span></span>`;
}

function categoryBar(name, description, score, grade) {
  const color = grade.color;
  return `
    <div class="category-row">
      <div class="category-info">
        <span class="category-name">${name}</span>
        <span class="category-desc">${description}</span>
      </div>
      <div class="category-bar-wrap">
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width:${score}%; background: linear-gradient(90deg, ${color}cc, ${color})"></div>
        </div>
        <span class="category-score" style="color:${color}">${score}</span>
      </div>
      ${gradeBadge(grade.grade, grade.label, grade.color)}
    </div>`;
}

function findingIcon(type) {
  if (type === 'critical') return `<span class="finding-icon critical">✕</span>`;
  if (type === 'warning') return `<span class="finding-icon warning">!</span>`;
  if (type === 'success') return `<span class="finding-icon success">✓</span>`;
  return `<span class="finding-icon info">i</span>`;
}

function pageCard(page, index) {
  const scoreColor = page.grade.color;
  const mobileColor = page.responsiveness.mobile.color;
  const navColor = page.navigation.health.color;
  const healthColor = page.health.ok ? '#22c55e' : '#ef4444';

  const findings = page.findings
    .map(
      (f) => `
    <div class="finding-item ${f.type}">
      ${findingIcon(f.type)}
      <span>${f.message}</span>
    </div>`,
    )
    .join('');

  const opportunities =
    page.opportunities.length > 0
      ? `
    <div class="opp-list">
      ${page.opportunities.map((o) => `<div class="opp-item">→ ${o}</div>`).join('')}
    </div>`
      : '';

  return `
    <div class="page-card" style="--accent: ${scoreColor}">
      <div class="page-card-header">
        <div class="page-index">PAGE ${String(index + 1).padStart(2, '0')}</div>
        <div class="page-url-wrap">
          <span class="page-slug">${page.slug}</span>
          <span class="page-full-url">${page.url}</span>
        </div>
        <div class="page-score-wrap">
          ${scoreRing(page.overallScore, 72)}
        </div>
      </div>

      <div class="page-metrics">
        <div class="metric-chip" style="--c: ${healthColor}">
          <span class="metric-dot" style="background:${healthColor}"></span>
          <span class="metric-label">HTTP ${page.health.status}</span>
        </div>
        <div class="metric-chip" style="--c: ${page.performance.firstContentfulPaint.grade?.color || '#888'}">
          <span class="metric-dot" style="background:${page.performance.firstContentfulPaint.grade?.color || '#888'}"></span>
          <span class="metric-label">FCP ${page.performance.firstContentfulPaint.formatted || 'N/A'}</span>
        </div>
        <div class="metric-chip" style="--c: ${page.performance.timeToFirstByte.grade?.color || '#888'}">
          <span class="metric-dot" style="background:${page.performance.timeToFirstByte.grade?.color || '#888'}"></span>
          <span class="metric-label">TTFB ${page.performance.timeToFirstByte.formatted || 'N/A'}</span>
        </div>
        <div class="metric-chip" style="--c: ${mobileColor}">
          <span class="metric-dot" style="background:${mobileColor}"></span>
          <span class="metric-label">Mobile: ${page.responsiveness.mobile.label}</span>
        </div>
        <div class="metric-chip" style="--c: ${navColor}">
          <span class="metric-dot" style="background:${navColor}"></span>
          <span class="metric-label">${page.navigation.health.label}</span>
        </div>
        <div class="metric-chip" style="--c: #64748b">
          <span class="metric-dot" style="background:#64748b"></span>
          <span class="metric-label">${page.navigation.totalLinks} links</span>
        </div>
      </div>

      <div class="page-body">
        <div class="findings-col">
          <div class="col-label">FINDINGS</div>
          ${findings}
        </div>
        ${
          page.opportunities.length > 0
            ? `
        <div class="opp-col">
          <div class="col-label">OPPORTUNITIES</div>
          ${opportunities}
        </div>`
            : ''
        }
      </div>

      ${
        page.performance.slowResources.length > 0
          ? `
      <div class="slow-resources">
        <div class="col-label">SLOW RESOURCES</div>
        <div class="resource-list">
          ${page.performance.slowResources
            .map(
              (r) => `
            <div class="resource-item">
              <span class="resource-type">${r.type}</span>
              <span class="resource-url">${r.url.length > 70 ? r.url.substring(0, 70) + '…' : r.url}</span>
              <span class="resource-dur">${r.duration}</span>
              ${r.sizeKB ? `<span class="resource-size">${r.sizeKB}KB</span>` : ''}
            </div>`,
            )
            .join('')}
        </div>
      </div>`
          : ''
      }
    </div>`;
}

// ─── Main HTML Builder ────────────────────────────────────────────────────────

function buildHTML(report) {
  const { meta, executiveSummary, pageBreakdown, opportunitySummary, categoryScorecard } = report;
  const generatedDate = new Date(meta.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const keyStats = executiveSummary.keyStats
    .map(
      (stat) => `
    <div class="key-stat ${stat.highlight ? 'highlight' : ''}">
      <span class="stat-icon">${stat.icon}</span>
      <span class="stat-value">${stat.value}</span>
      <span class="stat-label">${stat.label}</span>
      ${stat.subLabel ? `<span class="stat-sub">${stat.subLabel}</span>` : ''}
    </div>`,
    )
    .join('');

  const topFindings = executiveSummary.topFindings
    .map(
      (f) => `
    <div class="top-finding">${f}</div>`,
    )
    .join('');

  const categories = categoryScorecard.categories
    .map((c) => categoryBar(c.name, c.description, c.score, c.grade))
    .join('');

  const pageCards = pageBreakdown.map((page, i) => pageCard(page, i)).join('');

  const opportunities = opportunitySummary.items
    .map(
      (item) => `
    <div class="opp-summary-item">
      <span class="opp-num">${String(item.id).padStart(2, '0')}</span>
      <span class="opp-text">${item.opportunity}</span>
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${meta.reportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #080c14;
      --surface: #0d1420;
      --surface2: #111827;
      --border: rgba(255,255,255,0.07);
      --border-bright: rgba(255,255,255,0.14);
      --text: #e2e8f0;
      --muted: #64748b;
      --accent: #38bdf8;
      --accent2: #818cf8;
      --green: #22c55e;
      --yellow: #f59e0b;
      --red: #ef4444;
      --page-w: 210mm;
    }

    html { font-size: 14px; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      font-weight: 300;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Print Layout ── */
    @media print {
      body { font-size: 11px; }
      .cover-page, .section-break { page-break-after: always; }
      .page-card { page-break-inside: avoid; }
      .no-print { display: none; }
    }

    /* ── Typography ── */
    .font-display { font-family: 'Syne', sans-serif; }
    .font-mono { font-family: 'DM Mono', monospace; }

    /* ── Layout ── */
    .container { max-width: var(--page-w); margin: 0 auto; padding: 0 8mm; }

    /* ─────────────────────────────────────────
       COVER PAGE
    ───────────────────────────────────────── */
    .cover-page {
      min-height: 100vh;
      background: var(--bg);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 12mm 14mm;
    }

    .cover-bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .cover-bg-glow {
      position: absolute;
      top: -80px; right: -80px;
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%);
      border-radius: 50%;
    }

    .cover-bg-glow2 {
      position: absolute;
      bottom: 60px; left: -60px;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%);
      border-radius: 50%;
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
      z-index: 1;
      margin-bottom: auto;
    }

    .agency-name {
      font-family: 'Syne', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .cover-meta-tag {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      color: var(--muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 2px;
    }

    .cover-main {
      position: relative;
      z-index: 1;
      margin-bottom: 10mm;
    }

    .cover-eyebrow {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6mm;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cover-eyebrow::before {
      content: '';
      width: 30px;
      height: 1px;
      background: var(--accent);
    }

    .cover-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(32px, 6vw, 52px);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: #fff;
      margin-bottom: 4mm;
    }

    .cover-title span {
      color: var(--accent);
    }

    .cover-domain {
      font-family: 'DM Mono', monospace;
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 10mm;
    }

    .cover-score-row {
      display: flex;
      align-items: center;
      gap: 8mm;
      margin-bottom: 8mm;
    }

    .cover-score-ring svg { display: block; }

    .cover-score-text .score-num {
      font-family: 'Syne', sans-serif;
      font-size: 48px;
      font-weight: 800;
      line-height: 1;
      color: ${report.executiveSummary.grade.color};
    }

    .cover-score-text .score-grade {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${report.executiveSummary.grade.color};
      opacity: 0.8;
    }

    .cover-score-text .score-label {
      font-size: 11px;
      color: var(--muted);
      margin-top: 3px;
    }

    .cover-stats-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 3mm;
      margin-bottom: 8mm;
      position: relative;
      z-index: 1;
    }

    .cover-stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 4mm;
      text-align: center;
    }

    .cover-stat.highlight {
      border-color: rgba(239,68,68,0.3);
      background: rgba(239,68,68,0.05);
    }

    .cover-stat .c-stat-icon { font-size: 16px; display: block; margin-bottom: 2px; }
    .cover-stat .c-stat-val {
      font-family: 'Syne', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      line-height: 1;
      display: block;
    }
    .cover-stat.highlight .c-stat-val { color: var(--red); }
    .cover-stat .c-stat-lab {
      font-size: 9px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: block;
      margin-top: 2px;
    }
    .cover-stat .c-stat-sub {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      color: var(--green);
      display: block;
    }

    .cover-findings {
      position: relative;
      z-index: 1;
      border-top: 1px solid var(--border);
      padding-top: 4mm;
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
    }

    .cover-finding-pill {
      font-size: 10px;
      padding: 4px 10px;
      border-radius: 2px;
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text);
    }

    .cover-footer {
      position: relative;
      z-index: 1;
      margin-top: auto;
      padding-top: 4mm;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cover-footer-left {
      font-size: 9px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .cover-footer-right {
      font-size: 9px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    .cover-cta-box {
      position: relative;
      z-index: 1;
      margin-top: 6mm;
      background: linear-gradient(135deg, rgba(56,189,248,0.1), rgba(129,140,248,0.1));
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 6px;
      padding: 5mm 6mm;
    }

    .cover-cta-title {
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 3px;
    }

    .cover-cta-body {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.5;
    }

    /* ─────────────────────────────────────────
       SECTION HEADERS
    ───────────────────────────────────────── */
    .section-header {
      padding: 8mm 14mm 4mm;
      border-bottom: 1px solid var(--border);
      margin-bottom: 6mm;
    }

    .section-eyebrow {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 2mm;
    }

    .section-title {
      font-family: 'Syne', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #fff;
    }

    .section-sub {
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
    }

    /* ─────────────────────────────────────────
       SCORECARD
    ───────────────────────────────────────── */
    .scorecard-section {
      padding: 0 14mm 8mm;
    }

    .category-row {
      display: grid;
      grid-template-columns: 180px 1fr 80px;
      gap: 4mm;
      align-items: center;
      padding: 3.5mm 4mm;
      border-radius: 4px;
      margin-bottom: 2mm;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .category-info { min-width: 0; }
    .category-name {
      display: block;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: var(--text);
    }
    .category-desc {
      display: block;
      font-size: 9px;
      color: var(--muted);
      margin-top: 1px;
    }

    .category-bar-wrap {
      display: flex;
      align-items: center;
      gap: 3mm;
    }

    .category-bar-track {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }

    .category-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;
    }

    .category-score {
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      font-weight: 500;
      min-width: 28px;
      text-align: right;
    }

    .grade-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 3px;
      border: 1px solid;
      white-space: nowrap;
    }

    .grade-label { font-size: 9px; opacity: 0.8; }

    /* ─────────────────────────────────────────
       PAGE CARDS
    ───────────────────────────────────────── */
    .pages-section {
      padding: 0 14mm 8mm;
    }

    .page-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      border-radius: 4px;
      margin-bottom: 5mm;
      overflow: hidden;
    }

    .page-card-header {
      display: flex;
      align-items: center;
      gap: 4mm;
      padding: 4mm 5mm;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }

    .page-index {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      color: var(--muted);
      letter-spacing: 0.1em;
      min-width: 50px;
    }

    .page-url-wrap { flex: 1; min-width: 0; }

    .page-slug {
      display: block;
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      line-height: 1.3;
    }

    .page-full-url {
      display: block;
      font-size: 9px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .page-score-wrap { flex-shrink: 0; }

    .score-ring { display: block; }

    .page-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      padding: 3mm 5mm;
      border-bottom: 1px solid var(--border);
    }

    .metric-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      padding: 3px 7px;
      border-radius: 2px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      color: var(--text);
    }

    .metric-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .page-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    .findings-col, .opp-col {
      padding: 4mm 5mm;
    }

    .findings-col { border-right: 1px solid var(--border); }

    .col-label {
      font-family: 'DM Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 3mm;
    }

    .finding-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 10px;
      color: var(--text);
      margin-bottom: 2mm;
      line-height: 1.4;
    }

    .finding-icon {
      flex-shrink: 0;
      width: 16px; height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      margin-top: 1px;
    }

    .finding-icon.critical { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
    .finding-icon.warning { background: rgba(245,158,11,0.15); color: var(--yellow); border: 1px solid rgba(245,158,11,0.3); }
    .finding-icon.success { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid rgba(34,197,94,0.3); }
    .finding-icon.info { background: rgba(56,189,248,0.1); color: var(--accent); border: 1px solid rgba(56,189,248,0.2); }

    .opp-item {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 2mm;
      padding-left: 10px;
      position: relative;
      line-height: 1.4;
    }

    .opp-item::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--accent);
    }

    .slow-resources {
      padding: 3mm 5mm;
      border-top: 1px solid var(--border);
    }

    .resource-list { margin-top: 2mm; }

    .resource-item {
      display: flex;
      align-items: center;
      gap: 3mm;
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      padding: 2mm 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .resource-item:last-child { border-bottom: none; }

    .resource-type {
      background: rgba(56,189,248,0.1);
      color: var(--accent);
      padding: 1px 5px;
      border-radius: 2px;
      font-size: 8px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .resource-url {
      flex: 1;
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .resource-dur { color: var(--yellow); flex-shrink: 0; }
    .resource-size { color: var(--muted); flex-shrink: 0; }

    /* ─────────────────────────────────────────
       OPPORTUNITIES SECTION
    ───────────────────────────────────────── */
    .opportunities-section {
      padding: 0 14mm 8mm;
    }

    .opp-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
    }

    .opp-summary-item {
      display: flex;
      align-items: flex-start;
      gap: 4mm;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 4mm;
    }

    .opp-num {
      font-family: 'DM Mono', monospace;
      font-size: 18px;
      font-weight: 500;
      color: rgba(56,189,248,0.2);
      line-height: 1;
      flex-shrink: 0;
      min-width: 28px;
    }

    .opp-text {
      font-size: 10px;
      color: var(--text);
      line-height: 1.5;
    }

    /* ─────────────────────────────────────────
       CLOSING / CTA PAGE
    ───────────────────────────────────────── */
    .closing-page {
      min-height: 50vh;
      background: var(--bg);
      position: relative;
      overflow: hidden;
      padding: 12mm 14mm;
    }

    .closing-grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .closing-content {
      position: relative;
      z-index: 1;
      max-width: 130mm;
    }

    .closing-eyebrow {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 4mm;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .closing-eyebrow::before {
      content: '';
      width: 24px;
      height: 1px;
      background: var(--accent);
    }

    .closing-title {
      font-family: 'Syne', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 4mm;
    }

    .closing-title span { color: var(--accent); }

    .closing-body {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.7;
      margin-bottom: 8mm;
    }

    .closing-bullets {
      display: flex;
      flex-direction: column;
      gap: 3mm;
      margin-bottom: 8mm;
    }

    .closing-bullet {
      display: flex;
      align-items: center;
      gap: 3mm;
      font-size: 11px;
      color: var(--text);
    }

    .closing-bullet::before {
      content: '✓';
      color: var(--green);
      font-weight: 700;
      font-size: 12px;
    }

    .closing-contact {
      background: linear-gradient(135deg, rgba(56,189,248,0.08), rgba(129,140,248,0.08));
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 6px;
      padding: 5mm 6mm;
    }

    .closing-contact-title {
      font-family: 'Syne', sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 3mm;
    }

    .closing-contact-body {
      font-size: 10px;
      color: var(--muted);
    }

    .watermark-score {
      position: absolute;
      right: 14mm;
      bottom: 10mm;
      font-family: 'Syne', sans-serif;
      font-size: 100px;
      font-weight: 800;
      color: rgba(255,255,255,0.025);
      line-height: 1;
      letter-spacing: -0.04em;
      user-select: none;
      pointer-events: none;
    }

    /* ─────────────────────────────────────────
       PAGE DIVIDER
    ───────────────────────────────────────── */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
      margin: 4mm 14mm;
    }

    .section-break {
      height: 4mm;
    }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════
     COVER PAGE
═══════════════════════════════════════ -->
<div class="cover-page">
  <div class="cover-bg-grid"></div>
  <div class="cover-bg-glow"></div>
  <div class="cover-bg-glow2"></div>
  <div class="watermark-score">${executiveSummary.overallScore}</div>

  <div class="cover-header">
    <span class="agency-name">${meta.tool}</span>
    <span class="cover-meta-tag">CONFIDENTIAL — ${generatedDate}</span>
  </div>

  <div class="cover-main" style="margin-top: auto;">
    <div class="cover-eyebrow">Website Performance Audit</div>
    <h1 class="cover-title">
      Site Performance<br/>
      <span>Audit Report</span>
    </h1>
    <div class="cover-domain font-mono">${meta.domain}</div>

    <div class="cover-score-row">
      <div class="cover-score-ring">
        ${scoreRing(executiveSummary.overallScore, 100)}
      </div>
      <div class="cover-score-text">
        <div class="score-num">${executiveSummary.overallScore}</div>
        <div class="score-grade">${executiveSummary.grade.grade} — ${executiveSummary.grade.label}</div>
        <div class="score-label">Overall Score / 100</div>
      </div>
    </div>
  </div>

  <div class="cover-stats-row">
    ${executiveSummary.keyStats
      .map(
        (stat) => `
    <div class="cover-stat ${stat.highlight ? 'highlight' : ''}">
      <span class="c-stat-icon">${stat.icon}</span>
      <span class="c-stat-val">${stat.value}</span>
      <span class="c-stat-lab">${stat.label}</span>
      ${stat.subLabel ? `<span class="c-stat-sub">${stat.subLabel}</span>` : ''}
    </div>`,
      )
      .join('')}
  </div>

  <div class="cover-findings">
    ${executiveSummary.topFindings.map((f) => `<div class="cover-finding-pill">${f}</div>`).join('')}
  </div>

  <div class="cover-cta-box">
    <div class="cover-cta-title">What This Report Means For Your Business</div>
    <div class="cover-cta-body">${executiveSummary.callToAction}</div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-left">${meta.tool} v${meta.version} &nbsp;·&nbsp; ${meta.auditedPages} pages audited</div>
    <div class="cover-footer-right">Generated ${generatedDate}</div>
  </div>
</div>

<!-- ═══════════════════════════════════════
     CATEGORY SCORECARD
═══════════════════════════════════════ -->
<div class="section-break"></div>

<div class="section-header container">
  <div class="section-eyebrow">Performance Overview</div>
  <h2 class="section-title">${categoryScorecard.title}</h2>
  <p class="section-sub">Scored across ${categoryScorecard.categories.length} core categories from ${meta.auditedPages} audited pages</p>
</div>

<div class="scorecard-section container">
  ${categories}
</div>

<div class="divider"></div>

<!-- ═══════════════════════════════════════
     OPPORTUNITIES
═══════════════════════════════════════ -->
<div class="section-header container">
  <div class="section-eyebrow">Quick Wins</div>
  <h2 class="section-title">${opportunitySummary.title}</h2>
  <p class="section-sub">${opportunitySummary.description}</p>
</div>

<div class="opportunities-section container">
  <div class="opp-summary-grid">
    ${opportunities}
  </div>
</div>

<div class="divider"></div>

<!-- ═══════════════════════════════════════
     PAGE-BY-PAGE BREAKDOWN
═══════════════════════════════════════ -->
<div class="section-header container">
  <div class="section-eyebrow">Detailed Analysis</div>
  <h2 class="section-title">Page-by-Page Breakdown</h2>
  <p class="section-sub">Individual audit results for each scanned page — findings, performance metrics, and recommendations</p>
</div>

<div class="pages-section container">
  ${pageCards}
</div>

<!-- ═══════════════════════════════════════
     CLOSING / SALES CTA
═══════════════════════════════════════ -->
<div class="closing-page">
  <div class="closing-grid-bg"></div>
  <div class="closing-content">
    <div class="closing-eyebrow">Ready to Fix This?</div>
    <h2 class="closing-title">Let's Turn These<br/><span>Findings Into Wins</span></h2>
    <p class="closing-body">
      This audit has surfaced ${executiveSummary.keyStats[1].value} critical issues and ${executiveSummary.keyStats[2].value} warnings across ${meta.auditedPages} pages of your site.
      Each one is a measurable drag on your search rankings, user experience, and bottom line.
      The good news? Every issue identified here has a clear, actionable fix.
    </p>
    <div class="closing-bullets">
      <div class="closing-bullet">Mobile responsiveness fixes that capture the 60%+ mobile audience</div>
      <div class="closing-bullet">Performance optimisations that reduce load times and bounce rates</div>
      <div class="closing-bullet">Navigation and link health repairs that protect your SEO rankings</div>
      <div class="closing-bullet">CTA improvements that turn visitors into leads and customers</div>
    </div>
    <div class="closing-contact">
      <div class="closing-contact-title">Start With a Free Strategy Call</div>
      <div class="closing-contact-body">
        Our team can walk you through the priority fixes for <strong style="color: var(--text)">${meta.domain}</strong>, provide accurate effort estimates, and show you exactly how we'd approach each issue.
        No obligation. Just a clear picture of what's possible.
      </div>
    </div>
  </div>
  <div class="watermark-score">${executiveSummary.grade.grade}</div>
</div>

</body>
</html>`;
}

// ─── PDF Conversion ──────────────────────────────────────────────────────────────

function convertToPDF(htmlContent) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ html: htmlContent });

    const options = {
      hostname: 'n8n.spctek.com',
      path: '/pdf-generate/pdf',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        fs.writeFileSync('report-final/report.pdf', pdfBuffer);
        console.log('✅  PDF report written to: report-final/report.pdf');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('❌  PDF conversion error:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// ─── Write output ─────────────────────────────────────────────────────────────

const html = buildHTML(report);
const outFile = 'report-final/report.html';

fs.mkdirSync('report-final', { recursive: true });
fs.writeFileSync(outFile, html);

console.log(`✅  HTML report written to: ${outFile}`);
console.log(`📄  Pages rendered: ${report.pageBreakdown.length}`);

// Convert to PDF
convertToPDF(html).catch((err) => {
  console.error('Failed to generate PDF');
  process.exit(1);
});
