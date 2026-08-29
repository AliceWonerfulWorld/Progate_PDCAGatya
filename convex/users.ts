import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOrCreateCurrentUser, requireCurrentUser } from './lib/auth'

export const ensureCurrentUser = mutation({
  args: {
    timezone: v.string(),
  },
  handler: async (ctx, args) => getOrCreateCurrentUser(ctx, args.timezone),
})

export const currentUser = query({
  args: {},
  handler: async (ctx) => requireCurrentUser(ctx),
})
