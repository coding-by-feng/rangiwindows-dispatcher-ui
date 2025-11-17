import { test, expect } from '@playwright/test'

// Basic smoke test to ensure the UI renders and core widgets are interactive
// - Loads home page
// - Verifies header text
// - Verifies calendar rendered (FullCalendar zh-cn has a 今天 button)
// - Opens the Create Project modal

test.describe('Rangi Windows UI smoke', () => {
  // @ts-ignore
  test('loads and opens Create Project modal', async ({ page }) => {
    await page.goto('/')

    // Header
    await expect(page.getByText('Rangi Windows 施工安排系统')).toBeVisible()

    // Calendar toolbar button in zh-cn
    await expect(page.getByRole('button', { name: '今天' })).toBeVisible()

    // Open modal
    await page.getByRole('button', { name: '新增项目' }).click()

    // Modal title visible
    await expect(page.getByRole('dialog').getByText('新增项目')).toBeVisible()
  })
})
