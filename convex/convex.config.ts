import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    AI_PROVIDER: v.optional(v.string()),
    LLM_API_KEY: v.optional(v.string()),
    LLM_API_URL: v.optional(v.string()),
    LLM_MODEL: v.optional(v.string()),
  },
})

export default app
