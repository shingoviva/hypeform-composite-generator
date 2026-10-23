const { webkit, chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
const base = process.env.APP_TEST_URL || 'http://127.0.0.1:8126/';
await fs.mkdir('tmp', { recursive: true });
for (const engine of [webkit, chromium]) {
  const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/transition-seed', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
    await page.goto(base + 'transition-seed');
    await page.evaluate(async () => {
      const { blankModel } = await import('/src/agencyCsv.ts');
      const { serializeDraft } = await import('/src/draftStorage.ts');
      const { writeWorkspace, writeModel, modelKey } = await import('/src/agencyStorage.ts');
      const { enableSecondPage } = await import('/src/secondPage.ts');
      const workspace = { version: 1, id: 'transition', collection: 'transition', title: 'Transition', enabled: true, modelIds: ['1', '2'] };
      for (const id of workspace.modelIds) {
        const state = enableSecondPage(blankModel(), id === '2');
        state.profile.name = id === '1' ? 'KATE SANADA' : 'ALEX MORGAN';
        state.profile.nameFont = id === '1' ? '"Oswald", sans-serif' : '"Anton", sans-serif';
        for (const [index, image] of Object.values(state.images).entries()) image.originalUrl = image.croppedUrl = `/demo/kate-${(index + Number(id)) % 5 + 1}.png`;
        await writeModel({ key: modelKey(workspace, id), collection: workspace.collection, id, name: state.profile.name, revision: 0, updatedAt: new Date().toISOString(), sourceProfile: state.profile }, await serializeDraft({ state, uiLanguage: 'en', highResolution: false }));
      }
      await writeWorkspace(workspace);
    });
    await page.goto(base);
    await page.locator('input[name="name"]').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('#composite-canvas img')].every(image => image.complete && image.naturalWidth));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const form = document.querySelector('.profile-form'); form.scrollTop = 420;
      window.transitionForm = form; window.transitionCanvas = document.getElementById('composite-canvas');
      window.transitionFrames = []; window.monitorTransition = true;
      const sample = () => {
        const root = document.getElementById('composite-canvas');
        window.transitionFrames.push({ sameForm: form === document.querySelector('.profile-form'), sameCanvas: root === window.transitionCanvas, scroll: form.scrollTop, transform: root?.style.transform, name: document.querySelector('input[name="name"]')?.value, ready: [...(root?.querySelectorAll('img') || [])].every(image => image.complete && image.naturalWidth) });
        if (window.monitorTransition) requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = async function () { await new Promise(resolve => setTimeout(resolve, 250)); return decode.call(this); };
    });
    const select = page.getByRole('combobox', { name: 'Current model', exact: true });
    for (const id of ['2', '1', '2', '1']) {
      await select.selectOption(id);
      await page.locator('[data-workspace-blocker]').waitFor();
      if (await page.locator('[data-workspace-blocker]').evaluate(el => getComputedStyle(el).backgroundColor) !== 'rgba(0, 0, 0, 0)') throw Error('Switch covers editor with a blank overlay');
      await page.locator('[data-workspace-blocker]').waitFor({ state: 'detached' });
      await page.waitForTimeout(120);
      if (await page.locator('#composite-canvas-page2').count() !== (id === '2' ? 1 : 0)) throw Error('Second-page state not switched');
    }
    const frames = await page.evaluate(() => { window.monitorTransition = false; return window.transitionFrames; });
    if (frames.some(frame => !frame.sameForm || !frame.sameCanvas)) throw Error('Editor DOM remounted');
    if (frames.some(frame => Math.abs(frame.scroll - 420) > 1)) throw Error('Form scroll jumped');
    if (frames.some(frame => !frame.ready)) throw Error('Incomplete photo painted during model transition');
    if (new Set(frames.map(frame => frame.transform)).size !== 1) throw Error('Preview scale jumped');
    await page.screenshot({ path: `tmp/agency-transition-${engine.name()}.png` });
    // A failed decode must leave the previous model and its photos usable.
    await page.evaluate(() => { HTMLImageElement.prototype.decode = () => Promise.reject(new Error('Simulated decode failure')); });
    await select.selectOption('2'); await page.getByRole('alert').waitFor();
    if (await page.locator('input[name="name"]').inputValue() !== 'KATE SANADA') throw Error('Failed load replaced active model');
    if (errors.length) throw Error(errors.join('\n'));
    console.log(engine.name(), `${frames.length} animation frames: stable editor DOM/scroll/scale, decoded photos, second-page switching and failed-load retention passed`);
  } finally { await browser.close(); }
}
