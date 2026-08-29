import { INPUT_LIMITS } from './constants'

// docs/technical-design.md #47-53 (generatePlan Action / AI Output / AI Fallback /
// Rule-based Fallback) と docs/acceptance-criteria.md AC-AI-003〜006 に対応。
//
// generatePlan Action(LLM呼び出し, #20)はLLM_API_KEYが必要なため別issue。
// このファイルはLLMを一切呼ばず、AIの出力(または失敗)を受けて最終的な
// PLANテキストを決めるルールベースの部分だけを扱う。

export type ActType = 'lighter' | 'same' | 'heavier' | 'changeApproach'

export interface ResolveNextPlanFallbackInput {
  mode: 'initial' | 'next'
  goalName: string
  currentPlan?: string
  actType?: ActType
}

function clampToPlanTextLimit(text: string): string {
  return text.length > INPUT_LIMITS.planText ? text.slice(0, INPUT_LIMITS.planText) : text
}

// AIが使えない場合の初回PLAN用の最低限のfallback。
function initialFallback(goalName: string): string {
  return clampToPlanTextLimit(`${goalName}のために5分だけ取り組む`)
}

// docs/technical-design.md #52 Rule-based Fallback。
export function resolveNextPlanFallback(input: ResolveNextPlanFallbackInput): string {
  const { mode, goalName, currentPlan, actType } = input
  const trimmedCurrentPlan = currentPlan?.trim()

  if (mode === 'initial' || !trimmedCurrentPlan) {
    return initialFallback(goalName)
  }

  switch (actType) {
    case 'lighter':
      return clampToPlanTextLimit(`${trimmedCurrentPlan}を半分の量で行う`)
    case 'heavier':
      return clampToPlanTextLimit(`${trimmedCurrentPlan}を少し増やして行う`)
    case 'changeApproach':
    case 'same':
    default:
      // 最低限、same -> currentPlan が成立すればアプリは継続できる(#52)。
      // changeApproach は本来手入力を促すが、fallback自体は必ず非空のPLAN候補を
      // 返す必要があるため(AC-AI-004/006)、編集可能な起点としてcurrentPlanを返す。
      return clampToPlanTextLimit(trimmedCurrentPlan)
  }
}

export interface AiPlanCandidate {
  nextPlan: string
  message?: string
}

// docs/technical-design.md #50 AI Result Validation。
export function isValidAiPlanCandidate(value: unknown): value is AiPlanCandidate {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  if (typeof candidate.nextPlan !== 'string') return false
  const trimmed = candidate.nextPlan.trim()
  if (trimmed.length === 0) return false
  if (trimmed.length > INPUT_LIMITS.planText) return false

  if ('message' in candidate && candidate.message !== undefined && typeof candidate.message !== 'string') {
    return false
  }

  return true
}

export interface ResolveNextPlanResult {
  nextPlan: string
  usedFallback: boolean
}

// rawAiOutput: LLMからの生JSON文字列。API失敗・timeout・network failure時はnullを渡す
// (AC-AI-006)。Broken JSON(AC-AI-003)・空/長すぎるnextPlan(AC-AI-004/005)は
// isValidAiPlanCandidate側で弾かれ、いずれもfallbackへ切り替わる。
export function resolveNextPlan(
  rawAiOutput: string | null,
  fallbackInput: ResolveNextPlanFallbackInput,
): ResolveNextPlanResult {
  if (rawAiOutput !== null) {
    try {
      const parsed: unknown = JSON.parse(rawAiOutput)
      if (isValidAiPlanCandidate(parsed)) {
        return { nextPlan: parsed.nextPlan.trim(), usedFallback: false }
      }
    } catch {
      // Broken JSON -> fall through to the rule-based fallback.
    }
  }

  return { nextPlan: resolveNextPlanFallback(fallbackInput), usedFallback: true }
}
