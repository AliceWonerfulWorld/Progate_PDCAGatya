import { clerk } from '@clerk/testing/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  GUEST_STORAGE_KEY,
  completeGuestCycle,
  createGuestGoalAndStartCycle,
  drawGuestGacha,
  resetGuestState,
  uniqueName,
} from './helpers'

const clerkEmail = process.env.E2E_CLERK_USER_EMAIL
const hasClerkE2eCredentials = Boolean(
  process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY && clerkEmail,
)

async function signIn(page: Page): Promise<void> {
  await page.goto('/')
  await clerk.signIn({ page, emailAddress: clerkEmail! })
  await page.goto('/goals/new')
  await expect(page.locator('#goal-name')).toBeVisible({ timeout: 20_000 })
}

async function completeSignedInCycle(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'PDCAを回す' }).click()
  await expect(page).toHaveURL(/\/pdca\/plan\//)
  await page.locator('#plan-text').fill('英単語を5個復習する')
  await page.getByRole('button', { name: 'このPLANで進む' }).click()
  await page.getByRole('button', { name: '振り返る' }).click()
  await page.getByRole('button', { name: '一部できた' }).click()
  await page.getByRole('button', { name: 'ちょうどよかった' }).click()
  await page.getByRole('button', { name: 'これでいく' }).click()
  await expect(page.getByText('PDCA COMPLETE!')).toBeVisible()
}

test.describe('Authenticated core flow', () => {
  test.skip(
    !hasClerkE2eCredentials,
    'CLERK_SECRET_KEY and E2E_CLERK_USER_EMAIL are required for authenticated E2E tests.',
  )

  test('AC-E2E-002: signed-in user can complete PDCA -> Gacha -> Collection', async ({ page }) => {
    await signIn(page)
    await page.locator('#goal-name').fill(uniqueName('Signed-in Goal'))
    await page.getByRole('button', { name: '作成する' }).click()
    await expect(page).toHaveURL(/\/goal\//)

    await completeSignedInCycle(page)
    await page.getByRole('link', { name: 'ガチャを回す' }).click()
    await page.getByRole('button', { name: '1回回す' }).click()
    await expect(page.getByRole('link', { name: 'コレクションを見る' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: 'コレクションを見る' }).click()
    await expect(page.getByRole('heading', { name: 'コレクション' })).toBeVisible()
    await expect(page.locator('img')).not.toHaveCount(0)
  })

  test('AC-E2E-001: Guest data migrates to the signed-in home', async ({ page }) => {
    await resetGuestState(page)
    const goalName = uniqueName('Migrated Guest Goal')
    await createGuestGoalAndStartCycle(page, goalName, '英単語を5個復習する')
    await completeGuestCycle(page)
    await drawGuestGacha(page)

    await clerk.signIn({ page, emailAddress: clerkEmail! })
    await page.goto('/')
    await expect(page.getByText(goalName)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('今日 1周')).toBeVisible({ timeout: 20_000 })
    await expect(page.evaluate((key) => window.localStorage.getItem(key), GUEST_STORAGE_KEY)).resolves.toBeNull()
  })
})
