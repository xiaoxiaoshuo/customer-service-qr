/* Usage: PLAYWRIGHT_MODULE=<existing module> node scripts/test-downloads.cjs --before <snapshot> --output <dir> [--url https://www.denuoxuankeji.com/] */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const output = arg('--output');
const before = arg('--before');
if (!output || !before) throw new Error('--output and --before are required');
fs.mkdirSync(output, { recursive: true });
const source = path.resolve(__dirname, '../docs');
const liveUrl = arg('--url');
const localUrl = 'https://customer-service-qr.test/';
const urls = {
  'windows-x64': 'https://alioss.denuoxuankeji.com/yunshu-claw-codex-updates/windows/0.1.18/builds/20261013-2037/YunshuClaw-0.1.18-windows-x64-full.zip',
  'mac-x64': 'https://alioss.denuoxuankeji.com/yunshu-claw-codex-updates/mac/0.1.5/%E4%BA%91%E6%9E%A2Claw-0.1.5-mac-x64.dmg',
  'mac-arm64': 'https://alioss.denuoxuankeji.com/yunshu-claw-codex-updates/mac/0.1.5/%E4%BA%91%E6%9E%A2Claw-0.1.5-mac-arm64.dmg',
};
const win = { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36', platform: 'Win32', hints: { platform: 'Windows', mobile: false } };
const mac = { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', platform: 'MacIntel' };
const scenarios = [
  { name: 'windows-chromium', profile: win, selected: 'windows-x64' },
  { name: 'windows-firefox-no-hints', profile: { ...win, hints: null, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0' }, selected: 'windows-x64' },
  { name: 'windows-touch-laptop', profile: { ...win, touch: 5 }, selected: 'windows-x64' },
  { name: 'windows-arm-manual', profile: { ...win, ua: 'Mozilla/5.0 (Windows NT 10.0; ARM64)' }, selected: '', status: '兼容性' },
  { name: 'mac-apple', profile: { ...mac, hints: { platform: 'macOS', values: { architecture: 'arm', bitness: '64' } } }, selected: 'mac-arm64' },
  { name: 'mac-intel', profile: { ...mac, hints: { platform: 'macOS', values: { architecture: 'x86', bitness: '64' } } }, selected: 'mac-x64' },
  { name: 'mac-safari-intel-looking-ua', profile: mac, selected: '', status: '无法可靠' },
  { name: 'mac-firefox-intel-looking-ua', profile: { ...mac, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0' }, selected: '', status: '无法可靠' },
  { name: 'mac-empty-hints', profile: { ...mac, hints: { platform: 'macOS', values: {} } }, selected: '', status: '无法可靠' },
  { name: 'mac-missing-bitness', profile: { ...mac, hints: { platform: 'macOS', values: { architecture: 'arm' } } }, selected: '', status: '无法可靠' },
  { name: 'mac-32bit-hints', profile: { ...mac, hints: { platform: 'macOS', values: { architecture: 'x86', bitness: '32' } } }, selected: '', status: '无法可靠' },
  { name: 'mac-rejected-hints', profile: { ...mac, hints: { platform: 'macOS', mode: 'reject' } }, selected: '', status: '无法可靠' },
  { name: 'mac-throwing-hints', profile: { ...mac, hints: { platform: 'macOS', mode: 'throw' } }, selected: '', status: '无法可靠' },
  { name: 'mac-conflicting-entropy', profile: { ...mac, hints: { platform: 'macOS', values: { platform: 'Windows', architecture: 'arm', bitness: '64' } } }, selected: '', status: '不一致' },
  { name: 'conflicting-platform', profile: { ...win, hints: { platform: 'macOS', values: { architecture: 'arm', bitness: '64' } } }, selected: '', status: '不一致' },
  { name: 'linux-manual', profile: { ua: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64', hints: { platform: 'Linux' } }, selected: '', status: '手动选择' },
  { name: 'unknown-manual', profile: { ua: 'Unknown browser', platform: '' }, selected: '', status: '手动选择' },
];
const mobileCases = [
  { name: 'iphone-390', width: 390, profile: { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1', platform: 'iPhone', touch: 5, mobile: true } },
  { name: 'android-360', width: 360, profile: { ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', touch: 5, mobile: true, hints: { platform: 'Android', mobile: true } } },
  { name: 'iphone-landscape-844', width: 844, profile: { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1', platform: 'iPhone', touch: 5, mobile: true } },
  { name: 'ipad-desktop-1024', width: 1024, profile: { ...mac, touch: 5, mobile: true } },
  { name: 'android-tablet-1280', width: 1280, profile: { ua: 'Mozilla/5.0 (Linux; Android 15; Tablet) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36', platform: 'Linux armv8l', touch: 5, mobile: true, hints: { platform: 'Android', mobile: false } } },
  { name: 'hints-mobile-1024', width: 1024, profile: { ...win, hints: { platform: 'Windows', mobile: true }, touch: 5, mobile: true } },
  { name: 'desktop-narrow-720', width: 720, profile: win },
  { name: 'desktop-narrow-767', width: 767, profile: win },
];
mobileCases.push(
  { name: 'wechat-iphone-414', width: 414, profile: { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 MicroMessenger/8.0.60', platform: 'iPhone', touch: 5, mobile: true, height: 780 } },
  { name: 'small-iphone-320', width: 320, profile: { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 MicroMessenger/8.0.60', platform: 'iPhone', touch: 5, mobile: true, height: 480 } },
  { name: 'android-short-360', width: 360, profile: { ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile MicroMessenger/8.0.60', platform: 'Linux armv8l', touch: 5, mobile: true, height: 640 } }
);
const report = { mode: liveUrl ? 'remote-preview' : 'local', startedAt: new Date().toISOString(), scenarios: [], desktopComparisons: [], mobileChecks: [], installerResponses: 'stubbed small attachment; no real installers downloaded', realOSCoverage: 'Chrome with simulated navigator profiles; native WeChat recognition/contact addition requires a real phone' };
let browser;
async function open(profile, width = 1440, root = source, isBaseline = false) {
  const context = await browser.newContext({ viewport: { width, height: profile.height || 1000 }, userAgent: profile.ua, isMobile: !!profile.mobile, hasTouch: !!profile.touch, reducedMotion: 'reduce', acceptDownloads: true });
  const hits = [];
  const errors = [];
  await context.route('https://alioss.denuoxuankeji.com/**', async route => {
    hits.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'content-disposition': 'attachment; filename="installer-test.bin"' }, body: 'small test fixture, not a real installer' });
  });
  const useLive = !!liveUrl && !isBaseline;
  if (!useLive) await context.route(localUrl + '**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    assert.ok(['index.html', 'styles.css', 'app.js', 'customer-service-qr.jpg'].includes(name), `Unexpected asset ${name}`);
    const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8', jpg: 'image/jpeg' };
    await route.fulfill({ status: 200, contentType: types[name.split('.').pop()], body: fs.readFileSync(path.join(root, name)) });
  });
  await context.addInitScript(p => {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: p.platform });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: p.touch || 0 });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedText = text; } } });
    let data;
    if (p.hints) {
      data = { platform: p.hints.platform, mobile: !!p.hints.mobile };
      if (p.hints.values !== undefined || p.hints.mode) data.getHighEntropyValues = keys => {
        window.__hintKeys = keys;
        if (p.hints.mode === 'throw') throw Error('synthetic denied');
        if (p.hints.mode === 'reject') return Promise.reject(Error('synthetic denied'));
        if (p.hints.mode === 'never') return new Promise(() => {});
        return new Promise(resolve => setTimeout(() => { window.__hintsResolved = true; resolve(p.hints.values || {}); }, p.hints.delay || 0));
      };
    }
    Object.defineProperty(navigator, 'userAgentData', { configurable: true, value: data });
  }, profile);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const response = await page.goto(useLive ? liveUrl : localUrl, { waitUntil: 'networkidle', timeout: 45000 });
  assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.qr-card__img').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.qr-card__img').evaluate(img => img.complete && img.naturalWidth === 640 && img.naturalHeight === 640), true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(overflow, false, 'horizontal overflow');
  return { context, page, hits, errors };
}
async function clickFixture(view, key) {
  assert.equal(await view.page.locator('#download-primary').getAttribute('href'), urls[key]);
  const request = view.context.waitForEvent('request', { predicate: r => r.url().startsWith('https://alioss.denuoxuankeji.com/'), timeout: 10000 });
  await view.page.locator('#download-primary').click();
  assert.equal((await request).url(), urls[key]);
}
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
(async () => {
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, headless: true } : { channel: 'chrome', headless: true });
  try {
    for (const scenario of scenarios) {
      const view = await open(scenario.profile);
      try {
        assert.equal(await view.page.locator('#desktop-download').isVisible(), true);
        if (scenario.selected) await view.page.waitForFunction(key => document.getElementById('download-platform').value === key, scenario.selected);
        else if (scenario.status) await view.page.waitForFunction(text => document.getElementById('download-status').textContent.includes(text), scenario.status);
        assert.equal(await view.page.locator('#download-platform').inputValue(), scenario.selected);
        assert.deepEqual(view.hits, [], 'detection must not download');
        for (const [key, url] of Object.entries(urls)) assert.equal(await view.page.locator(`option[value="${key}"]`).getAttribute('data-url'), url);
        if (['windows-chromium', 'mac-apple', 'mac-safari-intel-looking-ua'].includes(scenario.name)) {
          const current = await view.page.screenshot({ path: path.join(output, scenario.name + '.png'), fullPage: true, animations: 'disabled' });
          const previous = await open(scenario.profile, 1440, before, true);
          try {
            const baseline = await previous.page.screenshot({ path: path.join(output, scenario.name + '-before.png'), fullPage: true, animations: 'disabled' });
            assert.equal(current.equals(baseline), true, `Desktop changed: ${scenario.name}`);
            report.desktopComparisons.push({ name: scenario.name, pixelIdentical: true });
          } finally { await previous.context.close(); }
        }
        if (scenario.selected && ['windows-chromium', 'mac-apple', 'mac-intel'].includes(scenario.name)) await clickFixture(view, scenario.selected);
        assert.deepEqual(view.errors, []);
        report.scenarios.push({ name: scenario.name, passed: true, selected: scenario.selected });
      } finally { await view.context.close(); }
    }
    const manualView = await open(win);
    try {
      for (const key of Object.keys(urls)) {
        const previous = manualView.hits.length;
        await manualView.page.selectOption('#download-platform', key);
        assert.equal(manualView.hits.length, previous, 'selection alone must not download');
        assert.equal(await manualView.page.locator('#desktop-download').getAttribute('data-download-state'), 'manual');
        await clickFixture(manualView, key);
      }
      report.scenarios.push({ name: 'all-three-manual-download-clicks', passed: true });
    } finally { await manualView.context.close(); }
    for (const manual of [false, true]) {
      const view = await open({ ...mac, hints: { platform: 'macOS', mode: 'resolve', delay: 1800, values: { architecture: 'arm', bitness: '64' } } });
      try {
        if (manual) await view.page.selectOption('#download-platform', 'mac-x64');
        await view.page.waitForFunction(() => window.__hintsResolved === true);
        assert.equal(await view.page.locator('#download-platform').inputValue(), manual ? 'mac-x64' : '');
        assert.deepEqual(view.hits, []);
        report.scenarios.push({ name: manual ? 'manual-choice-beats-late-detection' : 'timeout-ignores-late-detection', passed: true });
      } finally { await view.context.close(); }
    }
    const pendingView = await open({ ...mac, hints: { platform: 'macOS', mode: 'never' } });
    try {
      await pendingView.page.locator('#download-primary').click();
      assert.deepEqual(pendingView.hits, []);
      await pendingView.page.waitForFunction(() => document.getElementById('download-status').textContent.includes('无法可靠'));
      await pendingView.page.selectOption('#download-platform', 'mac-arm64');
      await clickFixture(pendingView, 'mac-arm64');
      report.scenarios.push({ name: 'pending-button-does-not-queue-download', passed: true });
    } finally { await pendingView.context.close(); }
    for (const item of mobileCases) {
      const previous = await open(item.profile, item.width, before, true);
      let previousTop;
      try {
        previousTop = (await previous.page.locator('.qr-card__img').boundingBox()).y;
        await previous.page.screenshot({ path: path.join(output, item.name + '-before.png'), fullPage: false, animations: 'disabled' });
      } finally { await previous.context.close(); }
      const view = await open(item.profile, item.width);
      try {
        for (const hidden of ['#desktop-download', '.topbar', '.hero__copy', '#copy-link', '.qr-card__head', '#steps', '#faq', '#fab']) {
          assert.equal(await view.page.locator(hidden).isVisible(), false, `Unexpected mobile clutter: ${hidden}`);
        }
        assert.equal(await view.page.locator('#activation-title').isVisible(), true);
        assert.match(await view.page.locator('#activation-press').innerText(), /长按二维码识别/);
        assert.match(await view.page.locator('.activation-steps').innerText(), /添加微信联系人/);
        assert.match(await view.page.locator('.activation-steps').innerText(), /激活软件/);
        const geometry = await view.page.evaluate(() => {
          const image = document.querySelector('.qr-card__img');
          const box = image.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, width: box.width, height: box.height,
            stepsBottom: document.querySelector('.activation-steps').getBoundingClientRect().bottom,
            viewportHeight: innerHeight,
            imageReceivesTouches: document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) === image,
            contextMenuNotCanceled: image.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })) };
        });
        assert.ok(geometry.top <= 110 && geometry.top < previousTop, 'QR must move close to the top');
        assert.ok(Math.abs(geometry.width - geometry.height) < 1 && geometry.width >= 200, 'QR must stay square and readable');
        assert.ok(geometry.bottom < geometry.viewportHeight, 'Entire QR must fit the first screen');
        assert.ok(geometry.stepsBottom <= geometry.viewportHeight, 'Activation steps must fit the first screen');
        assert.equal(geometry.imageReceivesTouches, true);
        assert.equal(geometry.contextMenuNotCanceled, true);
        const current = await view.page.screenshot({ path: path.join(output, item.name + '-after.png'), fullPage: false, animations: 'disabled' });
        assert.equal(await view.page.evaluate(() => window.__hintKeys), undefined);
        assert.deepEqual(view.hits, []);
        await view.page.locator('.activation-help summary').click();
        assert.equal(await view.page.locator('#mobile-save-qr').isVisible(), true);
        let qrBytes;
        if (liveUrl) {
          const downloadEvent = view.page.waitForEvent('download');
          await view.page.locator('#mobile-save-qr').click();
          const download = await downloadEvent;
          qrBytes = fs.readFileSync(await download.path());
        } else {
          // Chrome's download manager cannot resolve the routed .test fixture origin.
          // Check its exact response bytes and click feedback locally; verify a real download on the HTTPS preview.
          qrBytes = Buffer.from(await view.page.locator('#mobile-save-qr').evaluate(async link => {
            const response = await fetch(link.href);
            const bytes = Array.from(new Uint8Array(await response.arrayBuffer()));
            link.addEventListener('click', event => event.preventDefault(), { once: true });
            link.click();
            return bytes;
          }));
        }
        assert.equal(sha(qrBytes), sha(fs.readFileSync(path.join(before, 'customer-service-qr.jpg'))));
        assert.match(await view.page.locator('#mobile-save-hint').innerText(), /长按二维码图片保存/);
        assert.deepEqual(view.errors, []);
        report.mobileChecks.push({ name: item.name, passed: true, qrMovedUpBy: previousTop - geometry.top, ...geometry, screenshotSha256: sha(current), qrBytesMatchOriginal: true, nativeDownloadVerified: !!liveUrl });
      } finally { await view.context.close(); }
    }
    const resizeView = await open(win, 767);
    try {
      assert.equal(await resizeView.page.locator('#desktop-download').isVisible(), false);
      await resizeView.page.setViewportSize({ width: 768, height: 1000 });
      await resizeView.page.waitForFunction(() => document.getElementById('download-platform').value === 'windows-x64');
      assert.equal(await resizeView.page.locator('#desktop-download').isVisible(), true);
      await resizeView.page.setViewportSize({ width: 390, height: 1000 });
      assert.equal(await resizeView.page.locator('#desktop-download').isVisible(), false);
      assert.deepEqual(resizeView.hits, []);
      report.scenarios.push({ name: '767-768-resize-boundary', passed: true });
    } finally { await resizeView.context.close(); }
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack;
    throw error;
  } finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
