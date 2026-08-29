import { v } from 'convex/values'
import { action, env } from './_generated/server'
import { INPUT_LIMITS } from './lib/constants'
import { resolveNextPlan, type ActType } from './lib/planFallback'

const actTypeValidator = v.union(
  v.literal('lighter'),
  v.literal('same'),
  v.literal('heavier'),
  v.literal('changeApproach'),
)

const doResultValidator = v.union(
  v.literal('completed'),
  v.literal('partial'),
  v.literal('notCompleted'),
)

const checkLoadValidator = v.union(
  v.literal('easy'),
  v.literal('justRight'),
  v.literal('slightlyHeavy'),
  v.literal('tooHeavy'),
)

const checkReasonValidator = v.union(
  v.literal('noTime'),
  v.literal('tooLarge'),
  v.literal('tooDifficult'),
  v.literal('noFocus'),
  v.literal('noMotivation'),
  v.literal('other'),
)

const recentHistoryValidator = v.object({
  planText: v.string(),
  doResult: v.optional(doResultValidator),
  checkLoad: v.optional(checkLoadValidator),
  checkReason: v.optional(checkReasonValidator),
  checkMemo: v.optional(v.string()),
  actType: v.optional(actTypeValidator),
  nextPlanCandidate: v.optional(v.string()),
})

const generatePlanArgs = {
  mode: v.union(v.literal('initial'), v.literal('next')),
  goalName: v.string(),
  currentPlan: v.optional(v.string()),
  doResult: v.optional(doResultValidator),
  checkLoad: v.optional(checkLoadValidator),
  checkReason: v.optional(checkReasonValidator),
  checkMemo: v.optional(v.string()),
  actType: v.optional(actTypeValidator),
  recentHistory: v.optional(v.array(recentHistoryValidator)),
}

const generatePlanReturns = v.object({
  nextPlan: v.string(),
  message: v.string(),
  usedFallback: v.boolean(),
})

const DEFAULT_OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_LLM_MODEL = 'gpt-4o-mini'
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b'
const LLM_TIMEOUT_MS = 8_000
const PLAN_CANDIDATE_SCHEMA = {
  type: 'object',
  properties: {
    nextPlan: {
      type: 'string',
      minLength: 1,
      maxLength: INPUT_LIMITS.planText,
    },
    message: {
      type: 'string',
    },
  },
  required: ['nextPlan', 'message'],
  additionalProperties: false,
} as const

type GeneratePlanInput = {
  mode: 'initial' | 'next'
  goalName: string
  currentPlan?: string
  doResult?: 'completed' | 'partial' | 'notCompleted'
  checkLoad?: 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
  checkReason?: 'noTime' | 'tooLarge' | 'tooDifficult' | 'noFocus' | 'noMotivation' | 'other'
  checkMemo?: string
  actType?: ActType
  recentHistory?: Array<{
    planText: string
    doResult?: 'completed' | 'partial' | 'notCompleted'
    checkLoad?: 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
    checkReason?: 'noTime' | 'tooLarge' | 'tooDifficult' | 'noFocus' | 'noMotivation' | 'other'
    checkMemo?: string
    actType?: ActType
    nextPlanCandidate?: string
  }>
}

function truncateText(text: string | undefined, limit: number): string | undefined {
  const trimmed = text?.trim()
  if (!trimmed) return undefined
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed
}

function sanitizedInput(args: GeneratePlanInput): GeneratePlanInput {
  return {
    ...args,
    goalName: truncateText(args.goalName, INPUT_LIMITS.goalName) ?? '',
    currentPlan: truncateText(args.currentPlan, INPUT_LIMITS.planText),
    checkMemo: truncateText(args.checkMemo, INPUT_LIMITS.checkMemo),
    recentHistory: args.recentHistory?.slice(0, 5).map((history) => ({
      ...history,
      planText: truncateText(history.planText, INPUT_LIMITS.planText) ?? '',
      checkMemo: truncateText(history.checkMemo, INPUT_LIMITS.checkMemo),
      nextPlanCandidate: truncateText(history.nextPlanCandidate, INPUT_LIMITS.nextPlanCandidate),
    })),
  }
}

function buildPrompt(args: GeneratePlanInput): string {
  const input = sanitizedInput(args)
  return [
    'PDCA GACHAの次のPLAN候補を1つだけ作ってください。',
    'JSON以外は返さないでください。形式は {"nextPlan":"...","message":"..."} です。',
    `nextPlanは1文字以上${INPUT_LIMITS.planText}文字以下。messageは短い日本語1文。`,
    'Goalを別の目的に変えないでください。1回で実行できる具体的で小さい行動にしてください。',
    '曖昧な精神論、過剰に難しい提案、ユーザーを責める表現は避けてください。',
    'actType=lighterの場合は、前回と同等以上に重い提案を基本的に避けてください。',
    '',
    `入力: ${JSON.stringify(input)}`,
  ].join('\n')
}

function extractResponseText(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const response = value as Record<string, unknown>

  if (typeof response.output_text === 'string') {
    return response.output_text
  }

  const output = response.output
  if (!Array.isArray(output)) return null

  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue
    const content = (item as Record<string, unknown>).content
    if (!Array.isArray(content)) continue

    for (const part of content) {
      if (typeof part !== 'object' || part === null) continue
      const partRecord = part as Record<string, unknown>
      if (partRecord.type === 'output_text' && typeof partRecord.text === 'string') {
        return partRecord.text
      }
    }
  }

  return null
}

function extractChatCompletionText(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const choices = (value as Record<string, unknown>).choices
  if (!Array.isArray(choices)) return null

  const firstChoice = choices[0]
  if (typeof firstChoice !== 'object' || firstChoice === null) return null

  const message = (firstChoice as Record<string, unknown>).message
  if (typeof message !== 'object' || message === null) return null

  const content = (message as Record<string, unknown>).content
  return typeof content === 'string' ? content : null
}

async function callGroq(args: GeneratePlanInput, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(env.LLM_API_URL ?? DEFAULT_GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.LLM_MODEL ?? DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You create small, concrete Japanese PDCA PLAN candidates and return JSON only.',
        },
        { role: 'user', content: buildPrompt(args) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'pdca_plan_candidate',
          strict: true,
          schema: PLAN_CANDIDATE_SCHEMA,
        },
      },
      reasoning_effort: 'low',
      temperature: 0.3,
      max_completion_tokens: 220,
    }),
    signal,
  })

  if (!response.ok) return null
  return extractChatCompletionText(await response.json())
}

async function callOpenAiResponses(args: GeneratePlanInput, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(env.LLM_API_URL ?? DEFAULT_OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.LLM_MODEL ?? DEFAULT_LLM_MODEL,
      input: buildPrompt(args),
      text: {
        format: {
          type: 'json_schema',
          name: 'pdca_plan_candidate',
          strict: true,
          schema: PLAN_CANDIDATE_SCHEMA,
        },
      },
      temperature: 0.3,
      max_output_tokens: 220,
    }),
    signal,
  })

  if (!response.ok) return null
  return extractResponseText(await response.json())
}

async function callLlm(args: GeneratePlanInput): Promise<string | null> {
  if (!env.LLM_API_KEY) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    if (env.AI_PROVIDER === 'groq') {
      return await callGroq(args, controller.signal)
    }

    return await callOpenAiResponses(args, controller.signal)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// docs/technical-design.md #47-53 and docs/acceptance-criteria.md AC-AI-001〜007.
// This action returns a candidate only. It never writes to Convex DB, so users must
// confirm the PLAN through the normal mutation flow before anything is saved.
export const generatePlan = action({
  args: generatePlanArgs,
  returns: generatePlanReturns,
  handler: async (_ctx, args) => {
    const rawAiOutput = await callLlm(args)
    return resolveNextPlan(rawAiOutput, {
      mode: args.mode,
      goalName: args.goalName,
      currentPlan: args.currentPlan,
      actType: args.actType,
    })
  },
})
