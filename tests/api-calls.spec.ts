import { test, expect } from '@playwright/test'

// Verify that clicking buttons triggers the corresponding backend API calls.
// We force runtime API mode to 'backend-test' and intercept all network requests
// to localhost:9005, counting and validating they are called.

// Small helper to produce a binary-like payload without Buffer type
const mkBin = (arr: number[]) => Uint8Array.from(arr) as any

test.describe('API calls wiring', () => {
  // @ts-ignore
  test.beforeEach(async ({ page }) => {
    // Force backend-test before app loads
    await page.addInitScript(() => {
      try { localStorage.setItem('rw_api_mode', 'backend-test') } catch {}
    })
  })

  // @ts-ignore
  test('buttons trigger backend requests', async ({ page }) => {
    const host = 'localhost:9005'

    const calls = {
      list: 0,
      get: 0,
      create: 0,
      update: 0,
      archive: 0,
      del: 0,
      photo: 0,
      exportExcel: 0,
      exportPDF: 0,
    }

    let nextId = 201
    const seedProject = {
      id: nextId,
      project_code: 'P-201',
      name: 'API Test Project',
      client_name: '张三', client_phone: '021-123456', address: '上海市',
      sales_person: 'Tim', installer: 'Peter', team_members: 'Peter, Jack',
      start_date: '2025-10-10', end_date: '2025-10-12', status: '施工中',
      today_task: '', progress_note: '', photo_url: '', archived: false,
      created_at: new Date().toISOString(),
    }
    let current = { ...seedProject }

    // Intercept list
    await page.route(`**://${host}/api/projects**`, async (route) => {
      const req = route.request()
      if (req.method() === 'GET') {
        calls.list++
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          // Return either array or envelope; FE supports both
          body: JSON.stringify([current]),
        })
      }
      if (req.method() === 'POST') {
        calls.create++
        const body = req.postDataJSON?.() || {}
        nextId += 1
        current = { ...current, ...body, id: nextId, project_code: `P-${nextId}` }
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(current),
        })
      }
      // Fallback
      return route.fallback()
    })

    // Intercept photos list BEFORE generic project routes
    await page.route(`**://${host}/api/projects/*/photos`, async (route) => {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })

    // Intercept single get, update, archive, delete, photo upload
    await page.route(`**://${host}/api/projects/*`, async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      if (req.method() === 'GET') {
        calls.get++
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(current) })
      }
      if (req.method() === 'PATCH') {
        const body = (() => { try { return req.postDataJSON?.() || {} } catch { return {} } })()
        if (Object.prototype.hasOwnProperty.call(body, 'archived')) {
          calls.archive++
          current = { ...current, archived: !!body.archived }
        } else {
          calls.update++
          current = { ...current, ...body }
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(current) })
      }
      if (req.method() === 'DELETE') {
        calls.del++
        return route.fulfill({ status: 204, body: '' })
      }
      if (req.method() === 'POST' && /\/photo$/.test(url.pathname)) {
        calls.photo++
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      }
      return route.fallback()
    })

    // Intercept export endpoints (moved to /api/export/*)
    await page.route(`**://${host}/api/export/excel**`, async (route) => {
      calls.exportExcel++
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename=export.xlsx` },
        body: 'excel-bytes',
      })
    })
    await page.route(`**://${host}/api/export/pdf**`, async (route) => {
      calls.exportPDF++
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=export.pdf` },
        body: '%PDF-1.4\n%...'
      })
    })

    // Visit the page (preview runs on 4173 baseURL)
    await page.goto('/')

    // Ensure initial list fetched
    await expect(page.getByText('Rangi Windows 施工安排系统')).toBeVisible()
    await expect(page.getByText('P-201')).toBeVisible()
    expect(calls.list).toBeGreaterThan(0)

    // Export buttons
    await page.getByRole('button', { name: '导出Excel' }).click()
    expect(calls.exportExcel).toBe(1)

    await page.getByRole('button', { name: '导出PDF' }).click()
    expect(calls.exportPDF).toBe(1)

    // Create project (open modal, fill minimal required fields)
    await page.getByRole('button', { name: '新增项目' }).click()
    const dlg = page.getByRole('dialog', { name: '新增项目' })
    await expect(dlg.getByText('新增项目')).toBeVisible()

    await dlg.getByLabel('项目名称').fill('New Project')
    await dlg.getByLabel('地址').fill('Test Street 1')
    await dlg.getByLabel('客户姓名').fill('客户A')
    await dlg.getByLabel('客户电话').fill('021-000000')
    await dlg.getByLabel('销售负责人').fill('Sales')
    await dlg.getByLabel('安装负责人').fill('Installer')

    // Pick dates
    await dlg.getByLabel('施工日期').click()
    // Fill start and end inputs directly for stability
    const rangeInputs = dlg.locator('.ant-picker-input input')
    await rangeInputs.nth(0).fill('2025-10-01')
    await rangeInputs.nth(0).press('Enter')
    await rangeInputs.nth(1).fill('2025-10-06')
    await rangeInputs.nth(1).press('Enter')

    // Close any overlays before clicking Create
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)

    await dlg.getByRole('button', { name: '创建' }).click()
    // Should have called create and then loaded drawer for new project
    expect(calls.create).toBe(1)

    // Drawer save (update)
    const drawer = page.getByRole('dialog', { name: /项目详情/ })
    await expect(drawer.getByText('项目详情')).toBeVisible()
    await drawer.getByLabel('今日任务').fill('Do something')
    // Close overlays if any
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await drawer.getByRole('button', { name: '保存' }).click()
    expect(calls.update).toBe(1)

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: mkBin([0xff, 0xd8, 0xff]) })
    expect(calls.photo).toBe(1)

    // Archive
    await page.getByRole('button', { name: '归档' }).click()
    expect(calls.archive).toBe(1)

    // Delete
    await page.getByRole('button', { name: '删除' }).click()
    await page.getByTestId('confirm-delete').click()
    expect(calls.del).toBe(1)

    // Search triggers list again
    await page.getByPlaceholder('搜索项目/客户/地址').fill('API')
    await page.keyboard.press('Enter')
    expect(calls.list).toBeGreaterThan(1)

    // Status filter triggers list again
    await page.getByPlaceholder('状态筛选').click()
    await page.getByRole('option', { name: '施工中' }).click()
  })
})
