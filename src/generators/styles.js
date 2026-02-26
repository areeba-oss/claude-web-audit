/**
 * styles.js — All CSS for the HTML audit report.
 * Consistent light theme across every page (cover → content → closing).
 */

function getStyles(accentColor) {
  const accent = accentColor || '#1d4ed8';

  return `
    /* ── Reset & Variables ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #ffffff;
      --surface: #f8fafc;
      --surface2: #f1f5f9;
      --border: #e2e8f0;
      --border-bright: #cbd5e1;
      --text: #0f172a;
      --text-secondary: #334155;
      --muted: #64748b;
      --accent: ${accent};
      --accent-light: #eff6ff;
      --accent2: #6d28d9;
      --green: #16a34a;
      --green-light: #f0fdf4;
      --yellow: #b45309;
      --yellow-light: #fffbeb;
      --red: #dc2626;
      --red-light: #fef2f2;
      --navy: #0f172a;
      --page-w: 210mm;
      --page-h: 297mm;
    }

    html { font-size: 12.5px; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Print / PDF ── */
    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      html, body { font-size: 11px; }
      .pdf-page { page-break-after: always; break-after: page; }
      .pdf-page:last-child { page-break-after: auto; break-after: auto; }
      .no-break { page-break-inside: avoid; break-inside: avoid; }
      a { color: inherit; text-decoration: none; }
    }

    /* ── Typography helpers ── */
    .font-mono { font-family: 'DM Mono', monospace; }

    /* ── A4 page wrapper ── */
    .pdf-page {
      width: var(--page-w);
      min-height: var(--page-h);
      margin: 0 auto;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg);
    }

    /* ─────────────────────────────────────────
       PAGE HEADER BAR  (top of every content page)
    ───────────────────────────────────────── */
    .page-header-bar {
      background: var(--accent);
      padding: 3mm 10mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .page-header-bar .phb-left {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #ffffff;
    }

    .page-header-bar .phb-right {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      color: rgba(255,255,255,0.6);
    }

    /* ─────────────────────────────────────────
       PAGE FOOTER BAR  (bottom of every page)
    ───────────────────────────────────────── */
    .page-footer-bar {
      margin-top: auto;
      padding: 3mm 10mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    .page-footer-bar .pfb-left {
      font-size: 8px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    .page-footer-bar .pfb-right {
      font-size: 8px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    /* ─────────────────────────────────────────
       COVER PAGE
    ───────────────────────────────────────── */
    .cover-page {
      background: var(--bg);
      padding: 0;
    }

    .cover-accent-bar {
      height: 6mm;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      flex-shrink: 0;
    }

    .cover-body {
      flex: 1;
      padding: 12mm 14mm 8mm;
      display: flex;
      flex-direction: column;
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12mm;
    }

    .agency-name {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .cover-meta-tag {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      color: var(--muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 3px 10px;
      border-radius: 3px;
    }

    .cover-main {
      margin-bottom: 10mm;
    }

    .cover-eyebrow {
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

    .cover-eyebrow::before {
      content: '';
      width: 24px;
      height: 2px;
      background: var(--accent);
    }

    .cover-title {
      font-size: 40px;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: var(--navy);
      margin-bottom: 4mm;
    }

    .cover-title span { color: var(--accent); }

    .cover-domain {
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 10mm;
      padding: 2mm 0;
      border-bottom: 1px solid var(--border);
    }

    .cover-score-row {
      display: flex;
      align-items: center;
      gap: 8mm;
      margin-bottom: 10mm;
    }

    .cover-score-ring svg { display: block; }

    .cover-score-text .score-num {
      font-size: 48px;
      font-weight: 800;
      line-height: 1;
    }

    .cover-score-text .score-grade {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .cover-score-text .score-label {
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
    }

    /* Cover stats grid */
    .cover-stats-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 3mm;
      margin-bottom: 8mm;
    }

    .cover-stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 4mm 3mm;
      text-align: center;
    }

    .cover-stat.highlight {
      border-color: var(--red);
      background: var(--red-light);
    }

    .cover-stat .c-stat-icon {
      font-family: 'DM Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.05em;
      display: inline-block;
      background: var(--accent-light);
      color: var(--accent);
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      padding: 1px 5px;
      margin-bottom: 3px;
    }
    .cover-stat.highlight .c-stat-icon {
      background: var(--red-light);
      color: var(--red);
      border-color: #fecaca;
    }
    .cover-stat .c-stat-val {
      font-size: 20px;
      font-weight: 800;
      color: var(--navy);
      line-height: 1;
      display: block;
    }
    .cover-stat.highlight .c-stat-val { color: var(--red); }
    .cover-stat .c-stat-lab {
      font-size: 8px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: block;
      margin-top: 2px;
    }
    .cover-stat .c-stat-sub {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      color: var(--green);
      display: block;
      margin-top: 1px;
    }

    /* Cover findings pills */
    .cover-findings {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      margin-bottom: 6mm;
    }

    .cover-finding-pill {
      font-size: 9.5px;
      padding: 3px 10px;
      border-radius: 3px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }

    /* Cover CTA box */
    .cover-cta-box {
      background: var(--accent-light);
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 5mm 6mm;
      margin-bottom: 4mm;
    }

    .cover-cta-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 2px;
    }

    .cover-cta-body {
      font-size: 10.5px;
      color: var(--text-secondary);
      line-height: 1.55;
    }

    .cover-footer {
      margin-top: auto;
      padding-top: 4mm;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cover-footer-left,
    .cover-footer-right {
      font-size: 8.5px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    /* ─────────────────────────────────────────
       SECTION HEADERS
    ───────────────────────────────────────── */
    .section-header {
      padding: 7mm 10mm 4mm;
      border-bottom: 2px solid var(--border);
      margin-bottom: 4mm;
    }

    .section-eyebrow {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.5mm;
    }

    .section-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -0.01em;
    }

    .section-sub {
      font-size: 10.5px;
      color: var(--muted);
      margin-top: 2px;
    }

    /* ─────────────────────────────────────────
       EXECUTIVE SUMMARY (2-column stats + best/worst)
    ───────────────────────────────────────── */
    .exec-summary-body {
      padding: 0 10mm 4mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .exec-headline {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 5mm;
      line-height: 1.5;
    }

    .exec-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
      margin-bottom: 5mm;
    }

    .exec-stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 3.5mm 4mm;
      display: flex;
      align-items: center;
      gap: 3mm;
    }

    .exec-stat-card .esc-icon {
      font-family: 'DM Mono', monospace;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: var(--accent-light);
      color: var(--accent);
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      padding: 2px 5px;
      flex-shrink: 0;
      text-align: center;
      min-width: 28px;
    }

    .exec-stat-card .esc-val {
      font-size: 17px;
      font-weight: 800;
      line-height: 1;
      color: var(--navy);
    }

    .exec-stat-card .esc-label {
      font-size: 9px;
      color: var(--muted);
      margin-top: 1px;
    }

    .exec-stat-card .esc-sub {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      margin-top: 1px;
    }

    .exec-stat-card.highlight {
      border-color: var(--red);
      background: var(--red-light);
    }

    .exec-stat-card.highlight .esc-val { color: var(--red); }

    .best-worst-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
    }

    .bw-col-title {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 2mm;
      font-weight: 500;
    }

    .bw-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2.5mm 3mm;
      border-radius: 4px;
      margin-bottom: 1.5mm;
      font-size: 10px;
    }

    .bw-item.best { background: var(--green-light); border: 1px solid #bbf7d0; }
    .bw-item.worst { background: var(--red-light); border: 1px solid #fecaca; }

    .bw-slug { font-family: 'DM Mono', monospace; font-weight: 500; color: var(--text); }
    .bw-score { font-family: 'DM Mono', monospace; font-weight: 700; font-size: 11px; }

    /* ─────────────────────────────────────────
       SCORECARD
    ───────────────────────────────────────── */
    .scorecard-body {
      padding: 0 10mm 4mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .category-row {
      display: grid;
      grid-template-columns: 150px 1fr 105px;
      gap: 3mm;
      align-items: center;
      padding: 3.5mm 4mm;
      border-radius: 5px;
      margin-bottom: 2mm;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .category-info { min-width: 0; }
    .category-name { display: block; font-size: 11.5px; font-weight: 600; color: var(--text); }
    .category-desc { display: block; font-size: 8.5px; color: var(--muted); margin-top: 1px; }

    .category-bar-wrap { display: flex; align-items: center; gap: 3mm; }
    .category-bar-track { flex: 1; height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .category-bar-fill { height: 100%; border-radius: 3px; }
    .category-score { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; min-width: 26px; text-align: right; }

    .grade-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-family: 'DM Mono', monospace;
      font-size: 9.5px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid;
      white-space: nowrap;
      max-width: 105px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .grade-label { font-size: 8px; opacity: 0.75; }

    /* ─────────────────────────────────────────
       PAGE CARDS
    ───────────────────────────────────────── */
    .pages-body {
      padding: 0 10mm 3mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4mm;
    }

    .page-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      border-radius: 5px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .page-card-header {
      display: flex;
      align-items: center;
      gap: 3mm;
      padding: 2.5mm 4mm;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .page-index {
      font-family: 'DM Mono', monospace;
      font-size: 8px;
      color: var(--muted);
      letter-spacing: 0.12em;
      min-width: 45px;
    }

    .page-url-wrap { flex: 1; min-width: 0; }

    .page-slug {
      display: block;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      font-weight: 500;
      color: var(--navy);
      line-height: 1.2;
    }

    .page-full-url {
      display: block;
      font-size: 8.5px;
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
      gap: 1.5mm;
      padding: 2mm 4mm;
      border-bottom: 1px solid var(--border);
    }

    .metric-chip {
      display: flex;
      align-items: center;
      gap: 3px;
      font-family: 'DM Mono', monospace;
      font-size: 8px;
      padding: 1.5px 5px;
      border-radius: 3px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }

    .metric-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

    .page-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    .findings-col, .opp-col { padding: 2mm 3.5mm; }
    .findings-col { border-right: 1px solid var(--border); }

    .col-label {
      font-family: 'DM Mono', monospace;
      font-size: 7px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 1.5mm;
      font-weight: 500;
    }

    .finding-item {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      font-size: 8.5px;
      color: var(--text-secondary);
      margin-bottom: 1.5mm;
      line-height: 1.35;
    }

    .finding-overflow {
      font-size: 8px;
      color: var(--muted);
      font-style: italic;
      margin-top: 0.5mm;
    }

    .finding-icon {
      flex-shrink: 0;
      width: 12px; height: 12px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      font-weight: 700;
      margin-top: 1px;
    }

    .finding-icon.critical { background: var(--red-light); color: var(--red); border: 1px solid #fecaca; }
    .finding-icon.warning  { background: var(--yellow-light); color: var(--yellow); border: 1px solid #fde68a; }
    .finding-icon.success  { background: var(--green-light); color: var(--green); border: 1px solid #bbf7d0; }
    .finding-icon.info     { background: var(--accent-light); color: var(--accent); border: 1px solid #bfdbfe; }

    .opp-item {
      font-size: 8.5px;
      color: var(--text-secondary);
      margin-bottom: 1.5mm;
      padding-left: 10px;
      position: relative;
      line-height: 1.35;
    }

    .opp-item::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--accent);
      font-size: 9px;
    }

    .slow-resources {
      padding: 2.5mm 4mm;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }

    .resource-list { margin-top: 1.5mm; }

    .resource-item {
      display: flex;
      align-items: center;
      gap: 2mm;
      font-family: 'DM Mono', monospace;
      font-size: 8px;
      padding: 1.5mm 0;
      border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
    }

    .resource-item:last-child { border-bottom: none; }

    .resource-type {
      background: var(--accent-light);
      color: var(--accent);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 7.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      flex-shrink: 0;
      font-weight: 600;
    }

    .resource-url { flex: 1; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .resource-dur { color: var(--yellow); flex-shrink: 0; }
    .resource-size { color: var(--muted); flex-shrink: 0; }

    /* ─────────────────────────────────────────
       OPPORTUNITIES
    ───────────────────────────────────────── */
    .opp-section-body {
      padding: 0 10mm 4mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .opp-summary-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .opp-summary-item {
      display: flex;
      align-items: flex-start;
      gap: 4mm;
      padding: 3.5mm 4mm;
      border-bottom: 1px solid var(--border);
    }

    .opp-summary-item:first-child {
      border-top: 1px solid var(--border);
    }

    .opp-summary-item:nth-child(odd) {
      background: var(--surface);
    }

    .opp-num {
      font-family: 'DM Mono', monospace;
      font-size: 16px;
      font-weight: 600;
      color: var(--accent);
      opacity: 0.35;
      line-height: 1.25;
      flex-shrink: 0;
      min-width: 24px;
      text-align: right;
    }

    .opp-content {
      flex: 1;
      min-width: 0;
    }

    .opp-text {
      font-size: 10px;
      color: var(--text-secondary);
      line-height: 1.55;
    }

    .opp-overflow {
      margin-top: 4mm;
      padding: 3mm 4mm;
      background: var(--accent-light);
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      font-size: 9.5px;
      color: var(--accent);
      font-weight: 500;
      text-align: center;
    }

    /* ─────────────────────────────────────────
       CLOSING PAGE
    ───────────────────────────────────────── */
    .closing-page { background: var(--bg); padding: 0; }

    .closing-body-wrap {
      flex: 1;
      padding: 10mm 14mm 6mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
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
      height: 2px;
      background: var(--accent);
    }

    .closing-title {
      font-size: 28px;
      font-weight: 800;
      color: var(--navy);
      line-height: 1.12;
      margin-bottom: 5mm;
      letter-spacing: -0.02em;
    }

    .closing-title span { color: var(--accent); }

    .closing-body {
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.65;
      margin-bottom: 6mm;
    }

    .closing-body strong { color: var(--navy); font-weight: 700; }

    .closing-summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      margin-bottom: 6mm;
    }

    .closing-summary-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 4mm 3mm;
      text-align: center;
    }

    .closing-summary-val {
      font-size: 26px;
      font-weight: 800;
      line-height: 1;
      font-family: 'DM Mono', monospace;
    }

    .closing-summary-val span {
      font-size: 14px;
      font-weight: 500;
      opacity: 0.5;
    }

    .closing-summary-lab {
      font-size: 8.5px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 2px;
    }

    .closing-section-label {
      font-family: 'DM Mono', monospace;
      font-size: 8.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 3mm;
      font-weight: 600;
    }

    .closing-bullets {
      display: flex;
      flex-direction: column;
      gap: 2.5mm;
      margin-bottom: 6mm;
    }

    .closing-bullet {
      display: flex;
      align-items: flex-start;
      gap: 3mm;
      font-size: 10.5px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .closing-bullet::before {
      content: '✓';
      color: var(--green);
      font-weight: 700;
      font-size: 11px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .closing-cta-card {
      background: var(--accent-light);
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 6mm 7mm;
    }

    .closing-cta-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 3mm;
    }

    .closing-cta-body {
      font-size: 10.5px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .closing-cta-body strong {
      color: var(--navy);
      font-weight: 700;
    }

    .closing-accent-bar {
      height: 6mm;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      flex-shrink: 0;
      margin-top: auto;
    }
  `;
}

module.exports = { getStyles };
