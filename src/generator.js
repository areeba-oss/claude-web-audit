const fs = require('fs');
const path = require('path');
const { generateReport } = require('./generators/reportBuilder');

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const inputPath = process.argv[2];
const reportType = process.argv[3] || 'full'; // Default to 'full'
const generatePdf = process.argv.includes('--pdf'); // Flag to generate PDF (default false)

if (!inputPath) {
  console.error('Usage: node src/generator.js <input.json> [full|mini] [--pdf]');
  console.error('  Examples:');
  console.error('    node src/generator.js report.json              # Skips PDF generation');
  console.error('    node src/generator.js report.json full --pdf   # Generates full PDF');
  console.error('    node src/generator.js report.json mini --pdf   # Generates mini PDF');
  process.exit(1);
}

// Validate report type
const normalizedType = reportType.toLowerCase();
if (!['full', 'mini'].includes(normalizedType)) {
  console.error(`Error: Invalid report type "${reportType}". Use "full" or "mini".`);
  process.exit(1);
}

// Generate report based on type
const isFull = normalizedType === 'full';
const baseFilename = isFull ? 'report' : 'report-mini';

// Auto-increment filename if PDF generation is enabled
let outputFile = null;
if (generatePdf) {
  const outDir = 'outputs/report-final';
  fs.mkdirSync(outDir, { recursive: true });
  let filename = `${baseFilename}.pdf`;
  let counter = 1;
  while (fs.existsSync(path.join(outDir, filename))) {
    filename = `${baseFilename}-${counter}.pdf`;
    counter++;
  }
  outputFile = filename;
  console.log(`📄 PDF generation enabled`);
  console.log(`   Output: ${path.join(outDir, filename)}`);
} else {
  console.log(`⏭️  PDF generation disabled (use --pdf flag to enable)`);
}

generateReport(inputPath, outputFile, { includePageBreakdown: isFull }).catch((err) => {
  console.error('Failed to generate report:', err.message);
  process.exit(1);
});
