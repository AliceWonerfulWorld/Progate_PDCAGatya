import { expect, type Page } from '@playwright/test'

export const GUEST_STORAGE_KEY = 'pdca-gacha:guest-state'

export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function resetGuestState(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
}

export async function createGuestGoalAndStartCycle(page: Page, goalName: string): Promise<void> {
  await page.getByRole('link', { name: 'はじめる' }).click()
  await page.locator('#goal-name').fill(goalName)
  await page.getByRole('button', { name: '作成する' }).click()
  await expect(page).toHaveURL(/\/pdca\/plan\/guest$/)

  await page.getByRole('button', { name: 'これでやる' }).click()
  await expect(page).toHaveURL(/\/pdca\/do\/guest$/)
}

export async function completeGuestCycle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'CHECKへ進む' }).click()
  await page.getByRole('button', { name: 'できなかった' }).click()
  await expect(page).toHaveURL(/\/pdca\/check\/guest$/)

  await page.getByRole('button', { name: 'ちょうどよかった' }).click()
  await page.getByRole('button', { name: '次へ' }).click()
  await expect(page).toHaveURL(/\/pdca\/act\/guest$/)

  await page.getByRole('button', { name: 'これでいく' }).click()
  await expect(page).toHaveURL(/\/pdca\/complete\/guest$/)
  await expect(page.getByText('PDCA COMPLETE!')).toBeVisible()
}

export async function drawGuestGacha(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'ガチャを回す' }).click()
  await expect(page).toHaveURL(/\/gacha$/)
  const drawButton = page.getByRole('button', { name: '1回回す' })
  await expect(drawButton).toBeEnabled()
  await drawButton.click()
  await expect(page.getByText('この記録を残しますか？ログインすると、Goalとガチャ結果が保存されます。')).toBeVisible({
    timeout: 10_000,
  })
}
