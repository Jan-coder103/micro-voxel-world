import { expect, test } from '@playwright/test';
test('engine lifecycle, focused input and reset remain repeatable', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.viewport');
  const diagnostics = page.getByLabel('Engine diagnostics');
  await expect(scene).toHaveAttribute('data-lifecycle', 'ready');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(scene).toHaveAttribute('data-lifecycle', 'running');
  await page.keyboard.down('KeyD');
  await expect(diagnostics).not.toContainText('position 0.00, 0.00 m');
  await page.keyboard.up('KeyD');
  await page.keyboard.down('Space');
  await expect(diagnostics).not.toContainText('pulses 0/16');
  await page.keyboard.up('Space');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await diagnostics.textContent();
  await page.waitForTimeout(150);
  await expect(diagnostics).toHaveText(paused!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(scene).toHaveAttribute('data-lifecycle', 'running');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(diagnostics).toContainText('ready · tick 0');
    await expect(diagnostics).toContainText('pulses 0/16');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.keyboard.down('KeyD');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.keyboard.up('KeyD');
  await expect(diagnostics).toContainText('position 0.00, 0.00 m');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.screenshot({ path: 'test-results/phase-6-engine.png', fullPage: true });
});

test('page teardown cancels animation, detaches controls and tolerates repeated cleanup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide')); });
  await expect(page.locator('canvas')).toHaveCount(0);
  const diagnostics = page.getByLabel('Engine diagnostics');
  const stopped = await diagnostics.textContent();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForTimeout(150);
  await expect(diagnostics).toHaveText(stopped!);
  expect(errors).toEqual([]);
});
