// ecommerceAudit.js — detection from shared AI result, browser only used for cart flow

async function ecommerceAudit(browser, page, url, aiResult) {
  const ai = aiResult?.ecommerce || {};
  const result = {
    url,
    isEcommerce: ai.isEcommerce || false,
    ecommerceType: ai.type || null,
    ecommerceConfidence: ai.confidence || null,
    ecommerceSignals: ai.signals || [],
    reasoning: ai.reasoning || null,
    productLinksFound: 0,
    productPageOpened: false,
    addToCartWorked: false,
    cartPageLoaded: false,
    checkoutAccessible: false,
    detectionMethod: aiResult?.method || 'fallback',
    notes: [],
  };

  if (!ai.isEcommerce) {
    result.notes.push(`Not ecommerce: ${ai.reasoning || 'no signals'}`);
    return result;
  }

  // ── Only open new pages for cart flow testing ──────────────────────────
  const origin = new URL(url).origin;
  const aiProductLinks = ai.productLinks || [];

  // Get candidate links from existing page DOM (already loaded)
  const domLinks = await page.evaluate(
    (origin) =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.href)
        .filter((h) => h.startsWith(origin) && h !== location.href),
    origin,
  );

  const candidates = [...new Set([...aiProductLinks, ...domLinks])];
  result.productLinksFound = candidates.length;

  if (!candidates.length) {
    result.notes.push('No product links found.');
    return result;
  }

  const productUrl = aiProductLinks[0] || candidates[0];
  const productPage = await browser.newPage();

  try {
    await productPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await productPage.waitForLoadState('networkidle').catch(() => {});
    result.productPageOpened = true;
    result.productPageUrl = productPage.url();

    // Find add-to-cart button using AI's hint or common selectors
    const btnText = ai.addToCartText || '';
    const selectors = [
      btnText && `button:text-is("${btnText}")`,
      '[data-add-to-cart]',
      '[data-action="add-to-cart"]',
      'button[class*="add"]',
      'button[class*="cart"]',
      'button[class*="buy"]',
      'form[action*="cart"] button[type="submit"]',
    ].filter(Boolean);

    let addBtn = null;
    for (const sel of selectors) {
      const el = await productPage.$(sel).catch(() => null);
      if (el && (await el.isVisible().catch(() => false))) {
        addBtn = el;
        break;
      }
    }

    if (!addBtn) {
      result.notes.push('Add to cart button not found.');
      return result;
    }

    await addBtn.click({ timeout: 5000 });
    await productPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    result.addToCartWorked = true;

    // Navigate to cart
    const cartLink = await productPage.evaluate((origin) => {
      const a = Array.from(document.querySelectorAll('a[href]')).find(
        (a) => /cart|basket|bag/i.test(a.href) || /cart|basket|bag/i.test(a.innerText || ''),
      );
      return a?.href || null;
    }, origin);

    const cartUrl = cartLink || `${origin}/cart`;
    try {
      await productPage.goto(cartUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      result.cartPageLoaded = true;
      result.cartPageUrl = productPage.url();

      const checkoutEl = await productPage.evaluate(() => {
        const el = Array.from(document.querySelectorAll('a[href],button')).find(
          (el) =>
            /checkout|proceed|place.?order|pay.?now/i.test(el.innerText || '') ||
            /checkout/i.test(el.getAttribute('href') || ''),
        );
        return el ? el.href || 'button' : null;
      });
      if (checkoutEl) {
        result.checkoutAccessible = true;
        result.checkoutPageUrl = checkoutEl;
      }
    } catch {
      result.notes.push('Cart page not reachable.');
    }
  } catch (err) {
    result.notes.push(`Cart flow error: ${err.message}`);
  } finally {
    await productPage.close();
  }

  return result;
}

module.exports = ecommerceAudit;
