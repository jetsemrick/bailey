import { test, expect } from '@playwright/test';

test.describe('Multi-Cell Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (adjust this URL based on your app's routing)
    await page.goto('/');
    
    // Wait for the flow grid to be visible (adjust selector as needed)
    // This is a placeholder - you may need to login, create a round, etc.
    // For now, we assume the grid is accessible
  });

  test('should select a single cell with plain click', async ({ page }) => {
    // Click a cell
    const cell = page.locator('[data-cell-id="0:0"]').first();
    await cell.click();
    
    // Check that cell has primary selection styling
    await expect(cell).toHaveAttribute('aria-selected', 'true');
  });

  test('should toggle cells with Cmd/Ctrl-click', async ({ page, browserName }) => {
    // Select first cell
    const cell1 = page.locator('[data-cell-id="0:0"]').first();
    await cell1.click();
    await expect(cell1).toHaveAttribute('aria-selected', 'true');
    
    // Cmd/Ctrl-click second cell
    const modKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    const cell2 = page.locator('[data-cell-id="0:1"]').first();
    await cell2.click({ modifiers: [modKey] });
    
    // Both should be selected
    await expect(cell1).toHaveAttribute('aria-selected', 'true');
    await expect(cell2).toHaveAttribute('aria-selected', 'true');
    
    // Selection count should show
    await expect(page.locator('text=/2 cells selected/i')).toBeVisible();
  });

  test('should copy and paste cells', async ({ page, browserName, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Select and edit a cell
    const cell1 = page.locator('[data-cell-id="0:0"]').first();
    await cell1.dblclick();
    await page.keyboard.type('Test Content');
    await page.keyboard.press('Escape');
    
    // Select the cell
    await cell1.click();
    
    // Copy the cell
    const modKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modKey}+KeyC`);
    
    // Select a different cell
    const cell2 = page.locator('[data-cell-id="0:2"]').first();
    await cell2.click();
    
    // Paste
    await page.keyboard.press(`${modKey}+KeyV`);
    
    // Verify the content was pasted
    await expect(cell2).toContainText('Test Content');
  });

  test('should delete multiple selected cells', async ({ page, browserName }) => {
    // Add content to two cells
    const cell1 = page.locator('[data-cell-id="0:0"]').first();
    await cell1.dblclick();
    await page.keyboard.type('Content 1');
    await page.keyboard.press('Escape');
    
    const cell2 = page.locator('[data-cell-id="0:1"]').first();
    await cell2.dblclick();
    await page.keyboard.type('Content 2');
    await page.keyboard.press('Escape');
    
    // Select both cells
    await cell1.click();
    const modKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await cell2.click({ modifiers: [modKey] });
    
    // Delete
    await page.keyboard.press('Delete');
    
    // Both cells should be empty
    await expect(cell1).toHaveText('');
    await expect(cell2).toHaveText('');
  });

  test('should drag multiple cells in same column', async ({ page, browserName }) => {
    // Add content to cells
    const cell1 = page.locator('[data-cell-id="0:0"]').first();
    await cell1.dblclick();
    await page.keyboard.type('A');
    await page.keyboard.press('Escape');
    
    const cell2 = page.locator('[data-cell-id="0:1"]').first();
    await cell2.dblclick();
    await page.keyboard.type('B');
    await page.keyboard.press('Escape');
    
    const cell3 = page.locator('[data-cell-id="0:2"]').first();
    await cell3.dblclick();
    await page.keyboard.type('C');
    await page.keyboard.press('Escape');
    
    // Select first two cells
    await cell1.click();
    const modKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await cell2.click({ modifiers: [modKey] });
    
    // Drag to position 2 (they should move down)
    await cell1.dragTo(cell3);
    
    // Verify order changed: C, A, B
    const firstCell = page.locator('[data-cell-id="0:0"]').first();
    const secondCell = page.locator('[data-cell-id="0:1"]').first();
    const thirdCell = page.locator('[data-cell-id="0:2"]').first();
    
    await expect(firstCell).toContainText('C');
    await expect(secondCell).toContainText('A');
    await expect(thirdCell).toContainText('B');
  });

  test('should undo batch paste operation', async ({ page, browserName, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Select and copy two cells with content
    const cell1 = page.locator('[data-cell-id="0:0"]').first();
    await cell1.dblclick();
    await page.keyboard.type('First');
    await page.keyboard.press('Escape');
    
    const cell2 = page.locator('[data-cell-id="0:1"]').first();
    await cell2.dblclick();
    await page.keyboard.type('Second');
    await page.keyboard.press('Escape');
    
    // Select both and copy
    await cell1.click();
    const modKey = browserName === 'webkit' || process.platform === 'darwin' ? 'Meta' : 'Control';
    await cell2.click({ modifiers: [modKey] });
    await page.keyboard.press(`${modKey}+KeyC`);
    
    // Paste to a different location
    const cell3 = page.locator('[data-cell-id="0:3"]').first();
    await cell3.click();
    await page.keyboard.press(`${modKey}+KeyV`);
    
    // Verify paste worked
    const cell4 = page.locator('[data-cell-id="0:4"]').first();
    await expect(cell3).toContainText('First');
    await expect(cell4).toContainText('Second');
    
    // Undo (should undo entire paste as one operation)
    await page.keyboard.press(`${modKey}+KeyZ`);
    
    // Cells should be empty again
    await expect(cell3).toHaveText('');
    await expect(cell4).toHaveText('');
  });
});
