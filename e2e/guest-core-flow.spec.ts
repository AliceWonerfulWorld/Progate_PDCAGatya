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
    await createGuestGoalAndStartCycle(page, goalName)
    await completeGuestCycle(page)
    await drawGuestGacha(page)

    const guestState = await page.evaluate((key) => window.localStorage.getItem(key), GUEST_STORAGE_KEY)
    expect(guestState).toContain(goalName)
    expect(guestState).toContain('"status":"completed"')
    expect(guestState).toContain('"availableDraws":0')
  })

  test('AC-E2E-003: Guest reload resumes the saved DO step', async ({ page }) => {
    const goalName = uniqueName('Reload Goal')
    const planText = `${goalName}のために5分だけ取り組む`
    await createGuestGoalAndStartCycle(page, goalName)

    await page.reload()

    await expect(page).toHaveURL(/\/pdca\/do\/guest$/)
    await expect(page.getByText(planText)).toBeVisible()
    await expect(page.getByRole('button', { name: 'CHECKへ進む' })).toBeVisible()
  })

  test('AC-E2E-004: Guest focus guide advances from DO through the highlighted CHECK action', async ({ page }) => {
    const goalName = uniqueName('Resume Goal')
    const planText = `${goalName}のために5分だけ取り組む`
    await createGuestGoalAndStartCycle(page, goalName)
    expect(await page.evaluate((key) => window.localStorage.getItem(key), GUEST_STORAGE_KEY)).toContain(planText)

    await expect(page.getByText('終わったら、ここから振り返りへ進もう')).toBeVisible()
    await page.getByRole('button', { name: 'CHECKへ進む' }).click()
    await expect(page.getByRole('button', { name: 'できなかった' })).toBeVisible()
  })
})
