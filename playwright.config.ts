import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('test', process.cwd(), '')
Object.assign(process.env, env)

// Clerk's test helpers expect the non-Vite environment variable name. The
// browser bundle still receives only the VITE_ prefixed public value.
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'guest',
      testMatch: /guest-core-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'clerk setup',
      testMatch: /clerk\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authenticated',
      testMatch: /authenticated-core-flow\.spec\.ts/,
      dependencies: ['clerk setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, ...env },
  },
})
