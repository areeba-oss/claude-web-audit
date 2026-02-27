/**
 * reportBuilder.js — Shared report generation logic
 * Builds HTML and generates PDF for both full and mini reports
 */

const fs = require('fs');
const { getStyles } = require('./styles');
const {
  coverPage,
  executiveSummaryPage,
  scorecardPage,
  opportunitiesPage,
  pageBreakdownPages,
  closingPage,
} = require('./pages');
const { convertToPDF } = require('./pdfConverter');

/**
 * Build complete HTML report
 * @param {Object} report - Report data
 * @param {boolean} includePageBreakdown - Whether to include page breakdown section
 * @returns {string} Complete HTML document
 */
function buildReportHTML(report, includePageBreakdown = true) {
  const { meta, executiveSummary, pageBreakdown, opportunitySummary, categoryScorecard } = report;
  const generatedDate = new Date(meta.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const pages = [
    coverPage(meta, executiveSummary, generatedDate),
    executiveSummaryPage(meta, executiveSummary, generatedDate),
    scorecardPage(meta, categoryScorecard, generatedDate),
    opportunitiesPage(meta, opportunitySummary, generatedDate),
  ];

  if (includePageBreakdown) {
    pages.push(pageBreakdownPages(meta, pageBreakdown, generatedDate));
  }

  pages.push(closingPage(meta, executiveSummary));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${meta.reportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>${getStyles()}</style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}

/**
 * Generate PDF report from JSON data
 * @param {string} jsonPath - Path to input JSON file (relative to outputs/report-json/)
 * @param {string} outputPath - Path for output PDF (relative to outputs/report-final/)
 * @param {boolean} includePageBreakdown - Whether to include page breakdown section
 */
async function generateReport(jsonPath, outputPath, includePageBreakdown = true) {
  const report = JSON.parse(fs.readFileSync(`outputs/report-json/${jsonPath}`, 'utf8'));
  const html = buildReportHTML(report, includePageBreakdown);

  fs.mkdirSync('outputs/report-final', { recursive: true });

  const reportType = includePageBreakdown ? 'Full' : 'Mini';
  const pageCount = includePageBreakdown
    ? `${5 + Math.ceil(report.pageBreakdown.length / 2)} pages`
    : '5 pages';

  console.log(`✅  ${reportType} report generated`);
  console.log(`📄  ${pageCount} (${includePageBreakdown ? 'with' : 'without'} page breakdown)`);

  await convertToPDF(html, `outputs/report-final/${outputPath}`);
}

module.exports = { buildReportHTML, generateReport };
