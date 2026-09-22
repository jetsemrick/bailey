import { test, expect } from './fixtures/auth';

test.describe('Baseline smoke', () => {
  test('authenticated user reaches tournaments dashboard', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Tournaments' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New Tournament' })).toBeVisible();
  });

  test('new tournament form opens', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: '+ New Tournament' }).click();
    await expect(page.getByRole('heading', { name: 'New Tournament' })).toBeVisible();
  });
});
