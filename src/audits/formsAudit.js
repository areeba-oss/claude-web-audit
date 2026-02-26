// formsAudit.js — AI analysis from shared result, live tests on existing page

async function formsAudit(page, url, aiResult) {
  const result = { url, formCount: 0, forms: [] };

  try {
    const formsMeta = await page.evaluate(() =>
      Array.from(document.querySelectorAll('form')).map((form, i) => {
        const fields = Array.from(form.querySelectorAll('input,textarea,select'));
        const submitBtn = form.querySelector('[type="submit"],button:not([type])');
        return {
          index: i,
          fieldCount: fields.length,
          requiredCount: fields.filter((f) => f.required).length,
          inputTypes: fields.map((f) => ({
            type: f.type,
            name: f.name,
            placeholder: f.placeholder,
            required: f.required,
          })),
          labels: Array.from(form.querySelectorAll('label')).map((l) => l.innerText.trim()),
          submitText: (submitBtn?.innerText || submitBtn?.value || '').trim(),
          action: form.action || null,
          method: form.method || 'get',
        };
      }),
    );

    result.formCount = formsMeta.length;
    const aiForms = aiResult?.forms || [];

    for (const meta of formsMeta) {
      const aiForm = aiForms.find((f) => f.index === meta.index) || {};

      // Live test: empty submit on existing page (no reload needed)
      const liveTests = await page.evaluate((idx) => {
        const form = document.querySelectorAll('form')[idx];
        if (!form) return {};
        const submitBtn = form.querySelector('[type="submit"],button:not([type])');
        const emailField = form.querySelector('input[type="email"],input[name*="email"]');
        return {
          hasSubmitBtn: !!submitBtn,
          hasEmailField: !!emailField,
          hasRequired: form.querySelectorAll('[required]').length > 0,
          hasInvalidState: form.querySelectorAll(':invalid').length > 0,
        };
      }, meta.index);

      result.forms.push({
        index: meta.index,
        fieldCount: meta.fieldCount,
        purpose: aiForm.purpose || 'unknown',
        criticalMissingValidation: aiForm.criticalMissingValidation || [],
        isCritical: aiForm.isCritical ?? true,
        hasSubmitBtn: liveTests.hasSubmitBtn || false,
        hasEmailField: liveTests.hasEmailField || false,
        hasRequiredFields: liveTests.hasRequired || false,
        browserValidationActive: liveTests.hasInvalidState || false,
        detectionMethod: aiResult?.method || 'fallback',
      });
    }

    return result;
  } catch (err) {
    return { url, formCount: 0, forms: [], fatalError: err.message };
  }
}

module.exports = formsAudit;
