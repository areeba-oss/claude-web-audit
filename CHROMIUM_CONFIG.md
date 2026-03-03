# Chromium Configuration Guide for Server/Container Deployment

## Overview

When running this audit tool in a server or Docker container, you need to configure how Playwright launches the browser. Here are your best options, ranked by recommendation for server environments.

---

## Option 1: Playwright's Bundled Chromium (Recommended)

**Best for:** Docker/containers, serverless, any managed environment

### Setup

No extra configuration needed. Playwright automatically downloads and caches Chromium (~300MB).

### Code

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: true });
```

### Dockerfile

```dockerfile
FROM node:20-slim
COPY . /app
WORKDIR /app
RUN npm install
CMD ["npm", "run", "api"]
```

### Pros

- ✅ Zero system dependencies
- ✅ Works everywhere (same browser version across all machines)
- ✅ Automatic updates with Playwright
- ✅ Cached in Docker layer (one-time cost)

### Cons

- ❌ ~300MB download on first run
- ❌ Larger Docker image

---

## Option 2: System Chromium (Lighter)

**Best for:** Linux servers with existing Chromium installation

### Setup

#### Linux (Ubuntu/Debian)

```bash
apt-get update && apt-get install -y chromium-browser
```

#### Docker

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y chromium-browser
COPY . /app
WORKDIR /app
RUN npm install
CMD ["npm", "run", "api"]
```

### Code

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium-browser',
});
```

### Pros

- ✅ Smaller Docker image (~100MB vs ~400MB)
- ✅ Faster first run
- ✅ System package manage updates

### Cons

- ❌ Version mismatch risks (Playwright expects specific Chromium version)
- ❌ Linux-only

---

## Option 3: Auto-Detect System Browser (Safe Fallback)

**Best for:** Flexibility across dev/staging/prod environments

### Code

```javascript
const { chromium } = require('playwright');

async function launchBrowser() {
  let executablePath;

  // Auto-detect platform
  if (process.platform === 'win32') {
    executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (process.platform === 'darwin') {
    executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    executablePath = '/usr/bin/chromium-browser';
  }

  try {
    // Try system browser first
    return await chromium.launch({ headless: true, executablePath });
  } catch {
    // Fall back to bundled
    console.log('⚠️  System browser not found, using bundled Chromium');
    return await chromium.launch({ headless: true });
  }
}

// Usage in auditor.js
const browser = await launchBrowser();
```

### Pros

- ✅ Works on multiple platforms
- ✅ Falls back gracefully
- ✅ Smallest final image if system Chromium exists

### Cons

- ❌ Added complexity
- ❌ Error-prone version mismatch

---

## Option 4: Firefox (Smallest Download)

**Best for:** Minimal Docker images, low bandwidth environments

### Setup

```dockerfile
FROM node:20-alpine
RUN apk add firefox
```

### Code

```javascript
const { firefox } = require('playwright');

const browser = await firefox.launch({ headless: true });
```

### Pros

- ✅ Smaller (~180MB vs ~300MB)
- ✅ Lighter memory footprint
- ✅ Alpine Linux compatible

### Cons

- ❌ Different rendering engine (may produce different audit results)
- ❌ Less CSS/JS compatibility

---

## Comparison Table

| Option               | Image Size | Speed        | Complexity | Reliability |
| -------------------- | ---------- | ------------ | ---------- | ----------- |
| **Bundled Chromium** | ~400MB     | Slow (first) | Low        | ⭐⭐⭐⭐⭐  |
| **System Chromium**  | ~100MB     | Fast         | Medium     | ⭐⭐⭐      |
| **Auto-detect**      | Variable   | Fast         | High       | ⭐⭐⭐⭐    |
| **Firefox**          | ~300MB     | Slow (first) | Low        | ⭐⭐⭐      |

---

## Recommended Production Setup

### For Docker/Kubernetes:

```dockerfile
FROM node:20-slim

# Install system Chromium for smaller image
RUN apt-get update && apt-get install -y --no-install-recommends chromium-browser && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["npm", "run", "api"]
```

### Update `src/auditor.js`:

```javascript
const executablePath = '/usr/bin/chromium-browser';
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    '--no-sandbox', // Docker compat
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Reduce memory pressure
  ],
});
```

### Or keep it simple (Playwright defaults):

```dockerfile
FROM node:20-slim
COPY . /app
WORKDIR /app
RUN npm install --omit=dev
CMD ["npm", "run", "api"]
```

Uses bundled Chromium — larger image, but bulletproof reliability.

---

## Performance Tips for Server

1. **Add browser args to reduce memory:**

   ```javascript
   const browser = await chromium.launch({
     headless: true,
     args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
   });
   ```

2. **Reuse browser instance in API:**
   Already done in `src/api.js` — browser is created per request, which is fine for concurrent requests.

3. **Set ulimits in Docker:**
   ```yaml
   # docker-compose.yml
   services:
     audit-api:
       image: audit-api
       environment:
         - NODE_OPTIONS=--max-old-space-size=1024
       deploy:
         resources:
           limits:
             memory: 2G
   ```

---

## Summary

**Use Playwright's bundled Chromium** — it's the most reliable for server/container deployment. The extra ~100MB is worth the guaranteed compatibility. If you need a smaller image, install system Chromium in the Dockerfile and point Playwright to it.
