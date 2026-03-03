/**
 * test-api.js — Simple API test script
 *
 * Usage:
 *   npm run api              # Terminal 1: Start the server
 *   npm run test:api https://example.com   # Terminal 2: Test against a URL
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = 'localhost';
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.argv[2];

if (!TARGET_URL) {
  console.error('Usage: node test-api.js <url>');
  console.error('Example: node test-api.js https://example.com');
  process.exit(1);
}

function post(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            contentType: res.headers['content-type'] || '',
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('\n🧪 Testing API…\n');
  console.log(`📍 Target: ${TARGET_URL}`);
  console.log(`🔌 Server: http://${HOST}:${PORT}\n`);

  try {
    const start = Date.now();
    console.log('⏳ Generating audit report…\n');

    const res = await post({ url: TARGET_URL });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const sizeKB = (Buffer.byteLength(res.body) / 1024).toFixed(0);

    if (res.status === 200) {
      console.log(`✅ Success (${elapsed}s)`);
      console.log(`📦 Response: ${sizeKB} KB`);
      console.log(`📄 Content-Type: ${res.contentType}`);

      // Quick sanity checks on the HTML content
      const html = res.body;
      const pagesAudited = (html.match(/pages audited/i) || [''])[0];
      const formsMatch = html.match(/(\d+) form\(s\) found/i);
      const pagesMatch = html.match(/from (\d+) total pages audited/i);
      if (pagesMatch) console.log(`📊 Pages in report: ${pagesMatch[1]}`);
      if (formsMatch) console.log(`📝 Forms found: ${formsMatch[1]}`);

      // Save HTML for inspection
      const outFile = path.join(__dirname, 'outputs', 'report-final', 'test-report.html');
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, html, 'utf8');
      console.log(`\n💾 Saved → outputs/report-final/test-report.html`);
    } else {
      console.log(`❌ Error ${res.status}`);
      console.log(res.body);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Failed to connect to http://${HOST}:${PORT}`);
    console.error('   Is the API server running? Try: npm run api\n');
    process.exit(1);
  }
})();

if (!TARGET_URL) {
  console.error('Usage: node test-api.js <url>');
  console.error('Example: node test-api.js https://example.com');
  process.exit(1);
}

function post(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            contentType: res.headers['content-type'] || '',
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('\n🧪 Testing API…\n');
  console.log(`📍 Target: ${TARGET_URL}`);
  console.log(`🔌 Server: http://${HOST}:${PORT}\n`);

  try {
    const start = Date.now();
    console.log('⏳ Generating audit report…\n');

    const res = await post({ url: TARGET_URL });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const sizeKB = (Buffer.byteLength(res.body) / 1024).toFixed(0);

    if (res.status === 200) {
      console.log(`✅ Success (${elapsed}s)`);
      console.log(`📦 Response: ${sizeKB} KB`);
      console.log(`📄 Content-Type: ${res.contentType}\n`);
    } else {
      console.log(`❌ Error ${res.status}`);
      console.log(res.body);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Failed to connect to http://${HOST}:${PORT}`);
    console.error('   Is the API server running? Try: npm run api\n');
    process.exit(1);
  }
})();
