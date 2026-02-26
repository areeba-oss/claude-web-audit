const fs = require('fs');

const { getStyles } = require('./generators/styles');
const {
  coverPage,
  executiveSummaryPage,
  scorecardPage,
  opportunitiesPage,
  pageBreakdownPages,
  closingPage,
} = require('./generators/pages');
const { convertToPDF } = require('./generators/pdfConverter');

// â”€â”€â”€ CLI Entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: npm run generate <input.json>');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(`report-json/${inputPath}`, 'utf8'));

// â”€â”€â”€ Main HTML Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildHTML(report) {
  const { meta, executiveSummary, pageBreakdown, opportunitySummary, categoryScorecard } = report;
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
  <title>${meta.reportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>${getStyles()}</style>
</head>
<body>
  ${coverPage(meta, executiveSummary, generatedDate)}
  ${executiveSummaryPage(meta, executiveSummary, generatedDate)}
  ${scorecardPage(meta, categoryScorecard, generatedDate)}
  ${opportunitiesPage(meta, opportunitySummary, generatedDate)}
  ${pageBreakdownPages(meta, pageBreakdown, generatedDate)}
  ${closingPage(meta, executiveSummary)}
</body>
</html>`;
}

// â”€â”€â”€ Write output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const html = buildHTML(report);
const outFile = 'report-final/report.html';

fs.mkdirSync('report-final', { recursive: true });
fs.writeFileSync(outFile, html);

console.log(`âœ…  HTML report written to: ${outFile}`);
console.log(`ðŸ“„  Pages rendered: ${report.pageBreakdown.length}`);

// Convert to PDF
convertToPDF(html).catch((err) => {
  console.error('Failed to generate PDF');
  process.exit(1);
});
