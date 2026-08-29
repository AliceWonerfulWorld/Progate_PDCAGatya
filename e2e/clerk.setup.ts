import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

const hasClerkE2eCredentials = Boolean(
  process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY && process.env.E2E_CLERK_USER_EMAIL,
)

setup.describe.configure({ mode: 'serial' })

setup('prepare Clerk testing token', async ({ request }, testInfo) => {
  void request
  testInfo.skip(
    !hasClerkE2eCredentials,
    'CLERK_SECRET_KEY and E2E_CLERK_USER_EMAIL are required for authenticated E2E tests.',
  )
  await clerkSetup()
})
