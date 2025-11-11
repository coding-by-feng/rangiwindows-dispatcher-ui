import { test, expect } from '@playwright/test'

// Verify that updating a project posts all edited fields to the backend
// by intercepting the PATCH request body and asserting expected payload.

test.describe('Project update payload', () => {
  test.beforeEach(async ({ page }) =>
      await page.addInitScript(() => {
          try {
              localStorage.setItem('rw_api_mode', 'backend-test')
          } catch {
          }
      }))

  // @ts-ignore
  test('posts all fields when editing in drawer', async ({ page }) => {
    const host = 'localhost:9005'

    let current = {
      id: 301,
      project_code: 'P-301',
      name: 'Edit Test Project',
      client_name: '李四', client_phone: '021-222222', address: 'Auckland CBD',
      sales_person: 'Amy', installer: 'Peter', team_members: 'Peter, Jack',
      start_date: '2025-10-10', end_date: '2025-10-12', status: 'in_progress',
      today_task: '', progress_note: '', photo_url: '', archived: false,
      created_at: new Date().toISOString(),
    }

    const calls = { list: 0, update: 0 }
    let lastUpdateBody: any = null

    // Intercept list
    await page.route(`**://${host}/api/projects**`, async (route) => {
      const req = route.request()
      if (req.method() === 'GET') {
        calls.list++
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([current]) })
      }
      return route.fallback()
    })

    // Intercept get/update
    await page.route(`**://${host}/api/projects/*`, async (route) => {
      const req = route.request()
      if (req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(current) })
      }
      if (req.method() === 'PATCH') {
        try { lastUpdateBody = req.postDataJSON?.() || null } catch { lastUpdateBody = null }
        calls.update++
        current = { ...current, ...lastUpdateBody }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(current) })
      }
      return route.fallback()
    })

    // Intercept photos list for drawer
    await page.route(`**://${host}/api/projects/*/photos`, async (route) => {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })

    await page.goto('/')

    // Ensure project visible and open drawer by clicking row
    await expect(page.getByText('Edit Test Project')).toBeVisible()
    await page.getByText('P-301').first().click()

    // Enter edit mode
    await page.getByRole('button', { name: '编辑项目' }).click()

    const drawer = page.getByRole('dialog', { name: /项目详情/ })

    // Fill fields
    await drawer.getByLabel('项目名称').fill('Edited Project Name')
    await drawer.getByLabel('地址').fill('123 Queen St, Auckland')
    await drawer.getByLabel('客户姓名').fill('王五')
    await drawer.getByLabel('客户电话').fill('021-999999')
    await drawer.getByLabel('销售负责人').fill('Ben')
    await drawer.getByLabel('安装负责人').fill('Jack')
    await drawer.getByLabel('团队成员').fill('Jack, Liam')

    // Pick dates via direct input fill for stability
    await drawer.getByLabel('施工日期').click()
    const dateInputs = drawer.locator('.ant-picker-input input')
    await dateInputs.nth(0).fill('2025-10-01')
    await dateInputs.nth(0).press('Enter')
    await dateInputs.nth(1).fill('2025-10-06')
    await dateInputs.nth(1).press('Enter')

    // Change status to final payment received
    await drawer.getByLabel('状态').click()
    const option = page.getByRole('option', { name: '尾款已收到' })
    await option.waitFor({ state: 'visible' })
    await option.click()

    // Notes
    await drawer.getByLabel('今日任务').fill('Install windows')
    await drawer.getByLabel('状态备注').fill('80% done')

    // Ensure overlays are closed before saving
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await drawer.locator('.ant-drawer-body').click({ position: { x: 10, y: 10 } })

    // Save
    await drawer.getByRole('button', { name: '保存' }).click()

    // Assert update was called and payload has expected fields
    expect(calls.update).toBeGreaterThan(0)
    expect(lastUpdateBody).toBeTruthy()

    // Validate core fields present
    expect(lastUpdateBody).toMatchObject({
      name: 'Edited Project Name',
      address: '123 Queen St, Auckland',
      client_name: '王五',
      client_phone: '021-999999',
      sales_person: 'Ben',
      installer: 'Jack',
      team_members: 'Jack, Liam',
      status: 'final_payment_received',
      today_task: 'Install windows',
      progress_note: '80% done',
    })

    // Validate dates (present as YYYY-MM-DD strings)
    expect(typeof lastUpdateBody.start_date).toBe('string')
    expect(typeof lastUpdateBody.end_date).toBe('string')
    expect(lastUpdateBody.start_date.length).toBe(10)
    expect(lastUpdateBody.end_date.length).toBe(10)
  })
})
