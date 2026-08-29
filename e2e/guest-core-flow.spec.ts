import { expect, test } from '@playwright/test'
import {
  GUEST_STORAGE_KEY,
  completeGuestCycle,
  createGuestGoalAndStartCycle,
  drawGuestGacha,
  resetGuestState,
  uniqueName,
} from './helpers'

test.describe('Guest core flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetGuestState(page)
  })

  test('AC-E2E-001: Guest can complete Goal -> PDCA -> Gacha', async ({ page }) => {
    const goalName = uniqueName('Guest Goal')
    await createGuestGoalAndStartCycle(page, goalName, '英単語を5個復習する')
    await completeGuestCycle(page)
    await drawGuestGacha(page)

    const guestState = await page.evaluate((key) => window.localStorage.getItem(key), GUEST_STORAGE_KEY)
    expect(guestState).toContain(goalName)
    expect(guestState).toContain('"status":"completed"')
    expect(guestState).toContain('"availableDraws":0')
  })

  test('AC-E2E-003: Guest reload resumes the saved DO step', async ({ page }) => {
    const planText = uniqueName('Reload PLAN')
    await createGuestGoalAndStartCycle(page, uniqueName('Reload Goal'), planText)

    await page.reload()

    await expect(page).toHaveURL(/\/pdca\/do\/guest$/)
    await expect(page.getByText(planText)).toBeVisible()
    await expect(page.getByRole('button', { name: 'CHECKへ進む' })).toBeVisible()
  })
})
