import { test as base, expect, type Page } from '@playwright/test';

const DEFAULT_TEST_EMAIL = 'testuser@bailey.com';
const DEFAULT_TEST_PASSWORD = 'password123';

export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL ?? DEFAULT_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD ?? DEFAULT_TEST_PASSWORD;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Tournaments' })).toBeVisible({
    timeout: 15_000,
  });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
