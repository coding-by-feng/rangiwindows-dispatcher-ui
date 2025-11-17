import { test, expect } from '@playwright/test'

test.describe('Archive and Delete flows', () => {
  // @ts-ignore
  test('archive hides from list, toggle shows, delete removes', async ({ page }) => {
    await page.goto('/')

    // Seed two projects
    const seed = [
      {
        id: 101,
        project_code: 'P-101',
        name: 'Archive/Delete A',
        client_name: '王五', address: '南京市',
        sales_person: 'Tim', installer: 'Peter', team_members: 'Peter, Jack',
        start_date: '2025-10-10', end_date: '2025-10-12', status: '施工中',
        today_task: '', progress_note: '', photo_url: '', archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 102,
        project_code: 'P-102',
        name: 'Archive/Delete B',
        client_name: '赵六', address: '杭州市',
        sales_person: 'Alice', installer: 'Bob', team_members: 'Bob, Carol',
        start_date: '2025-10-15', end_date: '2025-10-20', status: '未开始',
        today_task: '', progress_note: '', photo_url: '', archived: false,
        created_at: new Date().toISOString(),
      },
    ]
    await page.evaluate(([data]) => localStorage.setItem('rw_projects', JSON.stringify(data)), [seed])
    await page.reload()

    // Open first project (works for table and mobile cards)
    await page.getByText('P-101').first().click()
    await expect(page.getByRole('dialog').getByText(/项目详情 P-101/)).toBeVisible()

    // Archive it (drawer will auto-close when includeArchived=false)
    await page.getByRole('button', { name: '归档' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Should be hidden from list by default
    await expect(page.getByText('P-101')).toHaveCount(0)

    // Toggle show archived
    await page.getByRole('switch').click()
    await expect(page.getByText('P-101')).toBeVisible()

    // Open and verify archived tag then delete
    await page.getByText('P-101').first().click()
    await expect(page.getByRole('dialog').getByText('已归档')).toBeVisible()

    await page.getByRole('button', { name: '删除' }).click()
    // Confirm via Popconfirm using data-testid
    await page.getByTestId('confirm-delete').click()

    // P-101 should be removed regardless of archived toggle
    await expect(page.getByText('P-101')).toHaveCount(0)
    // The other project remains
    await expect(page.getByText('P-102')).toBeVisible()
  })
})
