import { test, expect } from '@playwright/test'

// Verify that backend-prod mode uses VITE_API_BASE_PROD
// In .env.test we set VITE_API_BASE_PROD=http://localhost:9006

test.describe('API base selection - backend prod', () => {
  // @ts-ignore
  test('backend-prod sends requests to prod base host', async ({ page }) => {
    const host = 'localhost:9006'

    // Force backend-prod before app loads
    await page.addInitScript(() => {
      try { localStorage.setItem('rw_api_mode', 'backend-prod') } catch {}
    })

    const calls = { list: 0 }

    // Intercept list request against prod base
    await page.route(`**://${host}/api/projects**`, async (route) => {
      calls.list++
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/')

    // After loading, FE should call prod base to list
    await expect.poll(() => calls.list, { timeout: 5000 }).toBeGreaterThan(0)
  })
})
