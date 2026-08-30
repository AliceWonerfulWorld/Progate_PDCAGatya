import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    AI_PROVIDER: v.optional(v.string()),
    LLM_API_KEY: v.optional(v.string()),
    LLM_API_URL: v.optional(v.string()),
    LLM_MODEL: v.optional(v.string()),
    // Web Push (VAPID)。未設定でもアプリは動作し、Push送信のみ無効化される。
    VAPID_PUBLIC_KEY: v.optional(v.string()),
    VAPID_PRIVATE_KEY: v.optional(v.string()),
    VAPID_SUBJECT: v.optional(v.string()),
  },
})

export default app
