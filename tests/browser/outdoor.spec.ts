import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
test('outdoor quality comparison, collision overlays and stable rendering baseline', async ({ page, browser }, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const measurements = page.getByLabel('Rendering measurements');
  await expect(page.locator('.viewport')).toHaveAttribute('data-state','ready');
  const samples: Record<string, unknown>[] = [];
  const sceneCaptures: Buffer[] = [];
  for (const quality of ['high','low']) {
    await page.getByLabel('Render quality').selectOption(quality);
    await expect.poll(async () => {
      const raw = await measurements.getAttribute('data-sample');
      const sample = raw ? JSON.parse(raw) : {};
      return sample.quality === quality && sample.samples >= 30;
    }, { timeout: 30000 }).toBe(true);
    const sample = JSON.parse((await measurements.getAttribute('data-sample'))!);
    expect(sample.calls).toBeLessThan(40); expect(sample.triangles).toBeGreaterThan(50000);
    expect(sample.geometries).toBeLessThan(30);
    samples.push(sample);
    sceneCaptures.push(await page.locator('.viewport').screenshot());
    await page.screenshot({ path: `test-results/phase-7-${quality}.png`, fullPage: true });
  }
  expect(sceneCaptures[0].equals(sceneCaptures[1])).toBe(false);
  expect(Number(samples[0].calls)).toBeGreaterThan(Number(samples[1].calls));
  await page.getByLabel('Distance fog').uncheck();
  await page.getByLabel('Collision bounds').check();
  await expect.poll(async () => JSON.parse((await measurements.getAttribute('data-sample'))!).geometries).toBeGreaterThan(50);
  const overlayGeometries = JSON.parse((await measurements.getAttribute('data-sample'))!).geometries;
  await page.screenshot({ path: 'test-results/phase-7-proxies.png', fullPage: true });
  await page.getByLabel('Collision bounds').uncheck();
  await page.getByLabel('Collision bounds').check();
  await expect.poll(async () => JSON.parse((await measurements.getAttribute('data-sample'))!).geometries).toBe(overlayGeometries);
  await page.getByLabel('Collision bounds').uncheck();
  await page.getByLabel('Distance fog').check();
  await expect.poll(async () => JSON.parse((await measurements.getAttribute('data-sample'))!).calls).toBe(samples[1].calls);
  const gpu = await page.locator('canvas').evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2')!;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : 'unavailable';
  });
  await writeFile(testInfo.outputPath('render-baseline.json'), JSON.stringify({ browser: browser.version(), gpu, platform: process.platform, viewport: page.viewportSize(), samples }, null, 2));
  expect(errors).toEqual([]);
});
