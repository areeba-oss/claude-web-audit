// uiLayoutValidation.js — CTA from shared AI result, logo/header/footer/responsive via DOM

async function uiLayoutValidation(page, url, aiResult) {
    const result = { url };

    try {
        // ── Header & Footer (DOM) ──────────────────────────────────────────
        const structure = await page.evaluate(() => {
            const isVisible = el => {
                if (!el) return false;
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetHeight > 0;
            };
            const header = document.querySelector('header,[role="banner"],#header,.header,.site-header,.navbar');
            const footer = document.querySelector('footer,[role="contentinfo"],#footer,.footer,.site-footer');
            return {
                headerFound: !!header, headerVisible: isVisible(header),
                footerFound: !!footer, footerVisible: isVisible(footer)
            };
        });
        Object.assign(result, structure);

        // ── CTA (from shared AI result) ────────────────────────────────────
        const cta = aiResult?.cta;
        if (cta) {
            result.mainCTAVisible    = cta.found && cta.count > 0;
            result.ctaCount          = cta.count || 0;
            result.ctaTexts          = (cta.items || []).map(c => c.text);
            result.ctaTypes          = cta.items || [];
            result.ctaDetectionMethod = aiResult?.method || 'ai';
        } else {
            // DOM fallback
            const fb = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('button,a[role="button"],input[type="submit"]'))
                    .filter(el => { const s = window.getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null; });
                return { count: els.length, texts: els.slice(0, 5).map(el => (el.innerText || el.value || '').trim()) };
            });
            result.mainCTAVisible    = fb.count > 0;
            result.ctaCount          = fb.count;
            result.ctaTexts          = fb.texts;
            result.ctaDetectionMethod = 'dom-fallback';
        }

        // ── Logo (DOM) ─────────────────────────────────────────────────────
        const origin = new URL(url).origin;
        const logoData = await page.evaluate((origin) => {
            const candidates = Array.from(document.querySelectorAll('header img,header svg,[class*="logo"],[id*="logo"],.brand img,.navbar-brand img'));
            let best = null, bestScore = -1;
            for (const el of candidates) {
                let score = 0;
                const attrs = [el.className, el.id, el.alt, el.title].join(' ').toLowerCase();
                if (attrs.includes('logo')) score += 3;
                if (['img', 'svg'].includes(el.tagName.toLowerCase())) score += 1;
                const box = el.getBoundingClientRect();
                if (box.width >= 50) score += 1;
                if (box.height >= 20) score += 1;
                const visible = box.width > 0 && box.height > 0 && window.getComputedStyle(el).display !== 'none';
                if (visible) score += 1;
                const href = el.closest('a')?.href || null;
                if (href?.startsWith(origin)) score += 2;
                if (score > bestScore) { bestScore = score; best = { visible, href, width: box.width, height: box.height }; }
            }
            return best;
        }, origin);
        result.logoDetected  = !!logoData;
        result.logoVisible   = logoData?.visible ?? false;
        result.logoLinksHome = logoData?.href?.startsWith(origin) ?? false;

        // ── Responsiveness (DOM) ───────────────────────────────────────────
        result.responsiveness = {};
        for (const [label, width] of Object.entries({ mobile: 375, tablet: 768, desktop: 1440 })) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(200);
            const check = await page.evaluate(vp => ({
                responsive: document.body.clientWidth <= vp && document.documentElement.scrollWidth <= vp,
                hasHorizontalScroll: document.documentElement.scrollWidth > vp,
                bodyWidth: document.body.clientWidth
            }), width);
            result.responsiveness[label] = { viewportWidth: width, ...check };
        }
        await page.setViewportSize({ width: 1440, height: 900 });

        return result;
    } catch (err) {
        return { url, fatalError: err.message };
    }
}

module.exports = uiLayoutValidation;
