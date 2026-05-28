import { test, expect, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'testuser@bailey.com';
const password = process.env.E2E_PASSWORD ?? 'password123';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/', { timeout: 30_000 });
}

async function openFlowGrid(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { name: 'Tournaments' })).toBeVisible();

  const tournamentCard = page.locator('.group.bg-card.border').first();
  if ((await tournamentCard.count()) > 0) {
    await tournamentCard.click();
  } else {
    await page.getByRole('button', { name: '+ New Tournament' }).click();
    await page.locator('input[placeholder="Kansas Invitational"]').fill(`E2E Multi-Cell ${Date.now()}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/tournament\//, { timeout: 30_000 });
  }

  const roundRow = page.locator('.group.flex.items-center.gap-4.bg-card').first();
  if ((await roundRow.count()) > 0) {
    await roundRow.click();
  } else {
    await page.getByRole('button', { name: '+ Add Round' }).click();
    const opponent = page.getByPlaceholder('Kansas PS');
    if (await opponent.isVisible()) {
      await opponent.fill('E2E Opponent');
    } else {
      await page.getByPlaceholder('Team name').first().fill('E2E Aff');
      await page.getByPlaceholder('Team name').nth(1).fill('E2E Neg');
    }
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.group.flex.items-center.gap-4.bg-card').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('.group.flex.items-center.gap-4.bg-card').first().click();
  }

  await expect(page).toHaveURL(/\/round\//, { timeout: 30_000 });
  const flowTab = page.getByRole('button', { name: 'Flow' });
  if (await flowTab.isVisible().catch(() => false)) {
    await flowTab.click();
  }

  const addFlowTab = page.getByTitle('Add new flow tab');
  if (await addFlowTab.isVisible()) {
    await addFlowTab.click();
    await page.getByRole('button', { name: 'Affirmative' }).click();
    await page.getByRole('button', { name: 'Create Tab' }).click();
  }

  const colEl = page.locator('[data-flow-col]').first();
  await expect(colEl).toBeVisible({ timeout: 30_000 });
  const flowCol = (await colEl.getAttribute('data-flow-col')) ?? '0';
  await expect(page.locator(`[data-cell-id="${flowCol}:0"]`)).toBeVisible();
  return flowCol;
}

function cellSelector(flowCol: string, row: number) {
  return `[data-cell-id="${flowCol}:${row}"]`;
}

async function copySelection(page: Page) {
  await page.evaluate(async () => {
    const actions = (window as Window & {
      __baileyFlowActions?: { copy: () => Promise<void> };
    }).__baileyFlowActions;
    if (!actions?.copy) throw new Error('__baileyFlowActions.copy unavailable');
    await actions.copy();
  });
}

async function pasteSelection(page: Page) {
  await page.evaluate(async () => {
    const actions = (window as Window & {
      __baileyFlowActions?: { paste: () => Promise<void> };
    }).__baileyFlowActions;
    if (!actions?.paste) throw new Error('__baileyFlowActions.paste unavailable');
    await actions.paste();
  });
}

async function fillCell(page: Page, flowCol: string, row: number, text: string) {
  const cell = page.locator(cellSelector(flowCol, row));
  await cell.click();
  await page.keyboard.type(text);
  await page.locator(`[data-column-header="${flowCol}"]`).click();
  await expect(cell).toContainText(text, { timeout: 15_000 });
}

test.describe('Multi-cell flow grid', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY,
      'Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env'
    );
    await login(page);
  });

  test('Command-click multi-select, copy, paste, and same-column drag', async ({ page }) => {
    const flowCol = await openFlowGrid(page);
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    const cell = (row: number) => cellSelector(flowCol, row);

    await fillCell(page, flowCol, 0, 'Cell A');
    await fillCell(page, flowCol, 2, 'Cell B');
    await fillCell(page, flowCol, 4, 'Cell C');

    await page.locator(cell(0)).click();
    await page.locator(cell(2)).click({ modifiers: [mod] });
    await page.locator(cell(4)).click({ modifiers: [mod] });

    await expect(page.getByText('3 cells selected')).toBeVisible();

    await copySelection(page);

    await page.locator(cell(8)).click();
    await pasteSelection(page);

    await expect(page.locator(cell(8))).toContainText('Cell A', { timeout: 10_000 });
    await expect(page.locator(cell(10))).toContainText('Cell B');
    await expect(page.locator(cell(12))).toContainText('Cell C');

    await page.locator(cell(2)).click();
    await page.locator(cell(4)).click({ modifiers: [mod] });
    await page.locator(cell(2)).dragTo(page.locator(cell(6)));

    await page.waitForTimeout(800);
    await expect(page.locator(cell(6))).toContainText('Cell B');
    await expect(page.locator(cell(7))).toContainText('Cell C');
  });
});
