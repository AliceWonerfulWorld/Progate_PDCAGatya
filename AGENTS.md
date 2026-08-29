# AGENTS.md

## 1. Purpose

This repository uses coding agents as implementation assistants.

This file defines the rules that every coding agent MUST follow before changing code.

The primary goal is:

> Implement the documented product faithfully without inventing new product behavior, changing domain rules, or weakening data integrity.

The documents under `docs/` are the specification source of truth.

---

## 2. Required Reading

Before making changes, read the documents relevant to the task.

Minimum required documents:

```text
docs/overview.md
docs/product-spec.md
docs/user-flow.md
docs/tech-stack.md
docs/data-model.md
docs/technical-design.md
docs/implementation-plan.md
docs/acceptance-criteria.md
```

For UI work, also read:

```text
docs/ui-spec.md      (§36 = color / motion token policy)
src/index.css        (@theme = the actual token definitions)
```

UI work MUST follow §55.1 Design Tokens.

For gacha / character / reward work, also read:

```text
docs/game-design.md
```

Do not begin implementation from this file alone.

---

## 3. Source of Truth Priority

If multiple documents appear to conflict, use this priority:

```text
1. acceptance-criteria.md
2. technical-design.md
3. data-model.md
4. product-spec.md
5. user-flow.md
6. ui-spec.md
7. game-design.md
8. implementation-plan.md
9. overview.md
```

If the conflict cannot be resolved confidently:

```text
STOP
→ report the conflict
→ request a specification decision
```

Do not silently choose one interpretation.

---

## 4. Core Product Principle

PDCA GACHA is built around this loop:

```text
Goal
↓
PLAN
↓
DO
↓
CHECK
↓
ACT
↓
PDCA COMPLETE
↓
XP / Streak / Gacha
↓
Next PDCA
```

The implementation must preserve this loop.

Core product rule:

> The app evaluates completion of the PDCA cycle, not whether the task itself succeeded.

Therefore:

```text
doResult = completed
doResult = partial
doResult = notCompleted
```

must all be able to reach PDCA completion.

Task success/failure MUST NOT change the base PDCA reward.

---

## 5. Architecture

Standard architecture:

```text
React + Vite + TypeScript
↓
Convex
↓
Clerk
↓
LLM API via Convex Action
```

Responsibilities:

```text
React
→ UI and user intent

Convex Query
→ Read-only operations

Convex Mutation
→ Domain state changes

Convex Action
→ External API calls

Clerk
→ Authentication identity

Convex DB
→ Application source of truth
```

Do not move responsibilities between layers without explicit approval.

---

## 6. Query / Mutation / Action Rules

### Query

MUST:

```text
read data only
```

MUST NOT:

```text
update DB
grant rewards
call external LLM APIs
```

---

### Mutation

Use for:

```text
Goal create/update/archive
PDCA state transition
PDCA completion
XP updates
Streak updates
Gacha draw
Inventory update
Guest migration
Partner character changes
```

---

### Action

Use for:

```text
external LLM API calls
```

Do not move ordinary database business logic into Actions.

---

## 7. Authentication Rules

Never trust a client-provided user ID.

Forbidden API shape:

```ts
completePdcaCycle({
  cycleId,
  userId
})
```

Preferred:

```ts
completePdcaCycle({
  cycleId
})
```

The authenticated user MUST be resolved server-side through Clerk identity.

Use shared helpers where available:

```text
requireCurrentUser
requireOwnedGoal
requireOwnedCycle
```

Do not duplicate authorization logic unnecessarily.

---

## 8. Authorization Rules

Every user-owned resource must be ownership checked on the server.

Examples:

```text
goal.userId === currentUser._id
cycle.userId === currentUser._id
inventory.userId === currentUser._id
```

A user must never be able to:

```text
read another user's private Goal
edit another user's Goal
complete another user's PDCA
change another user's Inventory
set an unowned Character as partner
```

Frontend filtering is not authorization.

---

## 9. Client Trust Boundary

The client may send user intent and user-entered content.

Allowed examples:

```text
goalName
planText
doResult
checkLoad
checkReason
checkMemo
actType
```

The client MUST NOT determine:

```text
playerXp
playerLevel
currentStreak
longestStreak
availableGachaDraws
gacha rarity
character draw result
fragmentReward
drawSequence
reward amount
```

All reward/game-state values are server-authoritative.

---

## 10. PDCA Data Rule

One PDCA cycle is one database record.

Do NOT split the MVP into separate:

```text
plans
dos
checks
acts
```

tables.

Use:

```text
pdcaCycles
```

as the PDCA history source of truth.

---

## 11. PDCA Status

Allowed statuses:

```text
doing
checking
acting
completed
cancelled
```

Allowed transitions:

```text
doing → checking
checking → acting
acting → completed

doing → cancelled
checking → cancelled
acting → cancelled
```

Forbidden transitions include:

```text
doing → acting
doing → completed
checking → completed
completed → doing
cancelled → completed
```

All transitions must be validated server-side.

---

## 12. PDCA Record Creation

Create a `pdcaCycles` record only when PLAN is confirmed and the user starts the cycle.

Initial state:

```text
status = doing
```

Displaying a PLAN suggestion alone must not create a cycle.

---

## 13. PDCA Completion Invariant

Exactly one successful PDCA completion grants exactly one base reward.

Invariant:

```text
1 completed PDCA
=
+100 Player XP
+1 totalCycles
+1 availableGachaDraw
Goal totalCycles +1
Streak resolution once
```

Do not change these base values unless the specification changes.

---

## 14. PDCA Completion Idempotency

`completePdcaCycle` MUST be idempotent.

Calling it twice for the same cycle must not duplicate:

```text
XP
totalCycles
Goal totalCycles
Goal activeDays
Gacha rights
Streak
```

If a cycle is already completed, return a safe existing result or equivalent no-op response.

Never reward twice.

---

## 15. Goal Rules

Goals are long-term continuation targets.

Example:

```text
英語学習
```

A PLAN is a concrete action.

Example:

```text
英単語を5個復習する
```

Do not collapse Goal and PLAN into the same concept.

Archived Goals:

```text
must remain available for historical references
must not start new PDCA cycles
```

Use archive rather than destructive deletion for MVP.

---

## 16. Goal Aggregates

`goals.totalCycles` and `goals.activeDays` are cached aggregates.

For multiple cycles on the same local day:

```text
totalCycles += number of cycles
activeDays += 1 only
```

Keep aggregate updates consistent with `pdcaCycles`.

---

## 17. Player XP / Level Rules

Base PDCA XP:

```text
100 XP
```

Player Level is server-calculated.

Prefer a pure function:

```ts
calculatePlayerLevel()
```

Do not compute authoritative Level only in the frontend.

---

## 18. Gacha Rights

Each completed PDCA grants:

```text
availableGachaDraws += 1
```

Gacha rights can be saved for later.

Do not force an immediate draw.

---

## 19. Gacha Rules

Normal MVP rarity rates:

```text
R   70%
SR  25%
SSR 5%
```

Characters within the selected rarity are drawn evenly.

Inactive characters must not be drawn.

Do not add per-character weights unless the specification is changed.

---

## 20. Gacha Authority

Gacha is server-side.

The frontend calls:

```text
drawGacha()
```

The frontend must not specify:

```text
rarity
characterId
fragmentReward
```

---

## 21. Gacha Transaction Invariant

One successful gacha draw must produce:

```text
1 available draw consumed
1 Character result
1 Inventory create/update
1 gachaHistory record
totalGachaDraws +1
```

Do not display a confirmed result before the database mutation succeeds.

---

## 22. Duplicate Rewards

MVP duplicate fragment rewards:

```text
R   → 10
SR  → 20
SSR → 40
```

A duplicate Character must NOT create a second Inventory row.

Invariant:

```text
User × Character = max 1 Inventory record
```

Duplicate draw:

```text
duplicateCount += 1
fragmentCount += reward
```

---

## 23. Gacha History

Every successful gacha draw must create exactly one `gachaHistory` record.

Keep:

```text
characterId
rarity
wasDuplicate
fragmentReward
gachaType
drawSequence
drawnAt
```

Do not omit history creation from successful draws.

---

## 24. Streak Rules

Streaks are based on user-local dates.

Use:

```text
Server current time
+
users.timezone
```

Do NOT trust a client-provided current date.

---

## 25. Same-day Streak Rule

Multiple PDCA cycles on the same local day:

```text
totalCycles increases
currentStreak does not increase more than once
```

---

## 26. At-Risk State

When exactly one activity day is missed and Recovery is available:

```text
streakStatus = atRisk
pendingRecoveryDate = missed date
```

Do not immediately reset `currentStreak`.

---

## 27. Recovery Rules

Recovery:

```text
uses the normal pdcaCycles table
isRecovery = true
```

Do not create a separate Recovery table.

MVP Recovery limit:

```text
once per rolling 7 days
```

Use `lastRecoveryDate` rather than introducing redundant window-state unless required.

---

## 28. Recovery Meaning

Recovery protects the previous streak.

It does NOT count the missed date as an additional active day.

Example:

```text
8/27 → streak 14
8/28 → missed
8/29 → Recovery completed
```

Result:

```text
streak = 15
```

NOT:

```text
streak = 16
```

---

## 29. Recovery Deadline

Recovery is available only until the end of the next local day after the missed date.

After the deadline:

```text
currentStreak = 0
streakStatus = active
pendingRecoveryDate = undefined
```

according to the shared streak resolver.

---

## 30. Shared Streak Logic

Do not implement independent streak logic in multiple screens or mutations.

Prefer shared domain functions such as:

```text
resolveStreakState
isRecoveryAvailable
getLocalDateString
daysBetweenLocalDates
```

---

## 31. AI Role

AI is a helper, not a product authority.

Supported MVP uses:

```text
initial PLAN generation
next PLAN generation
```

Do not turn the product into a chat-heavy AI assistant without approval.

---

## 32. AI Output

Prefer structured JSON:

```json
{
  "nextPlan": "英単語を5個復習する",
  "message": "前回より少し軽めにしました"
}
```

Validate all LLM output.

---

## 33. AI Failure Rule

AI failure must NOT block the PDCA core loop.

Failures include:

```text
API failure
timeout
invalid JSON
empty output
invalid schema
overlong PLAN
```

Use rule-based fallback.

---

## 34. AI Authority Rule

AI suggestions must not be silently committed as user decisions.

Flow:

```text
AI suggestion
↓
User sees suggestion
↓
User confirms
↓
Mutation saves it
```

---

## 35. Guest Mode

The first experience must support Guest usage.

Guest persistent data uses:

```text
localStorage
```

Typical Guest data:

```text
guestSessionId
guestGoal
guestPdcaCycle
guestGachaState
```

---

## 36. Logged-in Source of Truth

After successful Login / migration:

```text
Convex = source of truth
```

Do not maintain a second authoritative copy of logged-in data in localStorage.

---

## 37. Guest Migration

Use a dedicated mutation:

```text
migrateGuestData
```

Do not emulate migration by replaying normal PDCA mutations blindly.

---

## 38. Guest Migration Idempotency

The same `guestSessionId` must be migrated at most once.

Repeated migration must not duplicate:

```text
Goal
PDCA
XP
Gacha rewards
Inventory
gachaHistory
```

Delete Guest localStorage only after migration succeeds.

---

## 39. Resume Behavior

Persist PDCA step progress.

On reload, users with cycles in:

```text
doing
checking
acting
```

must be able to continue from the correct point.

Do not rely on frontend-only navigation state.

---

## 40. PWA Scope

The MVP is:

> PWA, but not Offline-first.

Allowed:

```text
manifest
installable app shell
static asset caching
```

Not required:

```text
offline mutation queue
conflict resolution
full offline sync
```

Offline server-required actions must not appear successful.

---

## 41. Validation Rules

Server-side validation is required even if frontend validation exists.

Initial limits:

```text
Goal name         <= 100 chars
PLAN              <= 200 chars
CHECK memo        <= 500 chars
nextPlanCandidate <= 200 chars
displayName       <= 50 chars
```

Do not remove server validation.

---

## 42. Secret Management

Never expose secret API keys to the frontend.

Allowed public environment values may use frontend prefixes where required.

Secrets such as:

```text
LLM_API_KEY
```

must remain server-side.

Never expose an LLM secret via `VITE_*`.

---

## 43. Error Handling

Internal error codes and user-facing messages are separate.

Example:

```text
GACHA_NO_DRAW_AVAILABLE
```

UI:

```text
ガチャを引ける回数がありません
```

Do not render raw internal exceptions to users.

---

## 44. Required Shared Domain Functions

Prefer pure functions for domain rules.

Expected candidates:

```text
calculatePlayerLevel
rollRarity
getDuplicateFragmentReward
resolveStreakState
isRecoveryAvailable
resolveNextPlanFallback
isValidPdcaTransition
getLocalDateString
```

Do not bury all domain rules directly inside UI components.

---

## 45. Testing Priority

### P0

Must never regress:

```text
PDCA double reward
invalid PDCA transition
gacha balance corruption
Inventory duplication
unauthorized user access
streak corruption
Recovery corruption
Guest duplicate migration
AI fallback failure
```

### P1

Core features:

```text
Goal aggregation
Player level
PDCA resume
Collection
History
Profile
```

### P2

UX:

```text
filters
visual states
animations
minor display behavior
```

---

## 46. Required P0 Tests

At minimum, maintain tests for:

```text
same cycle complete twice → reward once
doing → completed → rejected
gacha with zero rights → rejected
duplicate Character → one Inventory row
User B cannot mutate User A Goal
User B cannot mutate User A Cycle
same day multiple cycles → streak +1 only
one-day miss → atRisk
Recovery success → preserve streak
Recovery deadline → reset
same guestSessionId twice → no duplication
LLM failure → fallback
```

---

## 47. Mutation Integration Tests

The following deserve mutation-level integration tests:

```text
completePdcaCycle
drawGacha
migrateGuestData
```

Pure function tests alone are not enough because these mutate multiple records.

---

## 48. Required Build Checks

Before declaring a task complete:

```text
TypeScript: no errors
Lint: no errors
Design tokens: no violations (npm run lint:tokens) — UI変更時
Relevant tests: pass
Existing P0 tests: pass
Production build: pass when task affects build/runtime
```

Do not report success with failing P0 tests.

---

## 49. Implementation Plan Usage

Follow `docs/implementation-plan.md`.

Do not implement unrelated future features while completing a scoped ticket.

Prefer small tasks.

Good:

```text
Implement submitCheck Mutation
```

Bad:

```text
Implement entire PDCA system and redesign UI
```

---

## 50. Acceptance Criteria IDs

When implementing a task, identify the relevant AC IDs from:

```text
docs/acceptance-criteria.md
```

Completion reports should include them.

Example:

```text
Implemented:
- AC-PDCA-013
- AC-PDCA-014
- AC-PLAYER-001
```

---

## 51. Forbidden Unapproved Changes

Do NOT change these without explicit specification approval:

```text
database table structure
PDCA status enum
PDCA state transitions
base PDCA XP
gacha rarity rates
duplicate fragment rewards
streak definition
Recovery definition
Guest migration strategy
Query / Mutation / Action responsibilities
authentication provider
core navigation structure
```

If implementation reveals a problem, report it instead of silently redesigning.

---

## 52. No Spec Invention

If something is unclear:

Do:

```text
identify the ambiguity
state the affected files / behavior
propose one or more options
mark as blocked if required
```

Do NOT:

```text
invent a new product rule
change schema without notice
add a new service
introduce a new abstraction
```

just to finish the task.

---

## 53. No Premature Abstraction

Avoid unnecessary:

```text
repository layers
service layers
DDD framework scaffolding
generic event buses
complex state management
microservices
over-generalized form engines
```

The MVP should remain easy to understand.

Use abstractions only when they remove real duplication or protect domain rules.

---

## 54. Frontend State Rule

Use:

```text
Convex → server state
React → local UI state
localStorage → Guest persistent state
```

Do not introduce Zustand or another global store unless there is a concrete need.

---

## 55. UI Rules

Follow `docs/ui-spec.md`.

Key principles:

```text
mobile-first
tap-centered
free text optional where possible
daily operation simple
reward experience expressive
```

Do not add unnecessary forms, settings, dashboards, or text-heavy flows.

---

## 55.1 Design Tokens (MUST)

Colors, durations, and easings are defined as design tokens in `src/index.css`
(`@theme` / `:root`). Policy lives in `docs/ui-spec.md` §36.

Never hardcode palette classes or numeric durations in `src/`:

```text
FORBIDDEN                  USE INSTEAD
bg-emerald-700         →   bg-primary
text-slate-500         →   text-text-subtle
border-slate-300       →   border-border
bg-rose-50             →   bg-attention-bg      (Streak At Risk)
text-amber-700         →   text-rarity-ssr      (gacha rarity)
text-violet-600        →   text-reward          (gacha / ticket)
bg-amber-100           →   bg-notice-bg         (offline etc.)
duration-150           →   duration-(--duration-fast)
```

### Tailwind v4 の落とし穴（必ず読む）

`--duration-*` はユーティリティ生成の namespace **ではない**。
`--duration-fast: 150ms` を定義しても `duration-fast` クラスは生成されず、
**ビルドは通るのに CSS に何も出力されない**ため気づきにくい。

```text
NG   duration-fast              → クラスが生成されない（無音で失敗）
NG   duration-150               → 値が焼き込まれ reduced-motion が効かない
OK   duration-(--duration-fast) → var() で出力され reduced-motion が効く
```

`--color-*` と `--ease-*` は生成される namespace なので
`bg-primary` / `ease-standard` はそのまま書ける。

### transition には必ず duration トークンを付ける

`transition-colors` だけ書くと Tailwind 既定の duration/easing に
フォールバックし、`prefers-reduced-motion` の対象外になる。

```text
NG   transition-colors
OK   transition-colors duration-(--duration-fast) ease-standard
```

`prefers-reduced-motion` は duration トークンを 0 に差し替えることで
**トークン層だけで**全画面に効く設計になっている。
そのため意図的に `*{transition-duration:0!important}` の全称セレクタは
置いていない。置くとトークンを経由しない取りこぼしが隠れてしまうため。

### 自動チェック

このルールは仕組みで担保されている（読み忘れても止まる）:

```text
node scripts/check-design-tokens.mjs   # 単体実行
npm run lint                            # oxlint と同時に実行される
.claude/hooks/check-design-tokens.mjs   # Edit/Write 前に自動で走る
```

新しくトークンが必要になった場合は、直書きせず `src/index.css` の
`@theme` に役割ベースの名前で追加すること。

---

## 56. Bottom Navigation

Standard tabs:

```text
Home
Collection
History
Profile
```

Gacha is not a permanent bottom tab.

PDCA flow may hide bottom navigation.

---

## 57. Product Copy Rule

Avoid blame-oriented UI language.

Do not default to:

```text
失敗
サボった
ダメだった
```

Prefer factual language:

```text
できなかった
少し重かった
今日はここまで
```

---

## 58. Character / Game Scope

MVP game layer:

```text
Character collection only
```

Future ideas such as:

```text
Character growth
Base growth
Buildings
10-pull
Soft pity
Paid gacha
```

must not be added unless explicitly requested.

---

## 59. Mission Scope

Do not create a dynamic Mission database for MVP unless required by an approved spec change.

Fixed Mission definitions may live in code.

---

## 60. Title Scope

Titles may be code-defined for MVP.

Do not add `titles` / `userTitles` tables without a real requirement.

---

## 61. Character Asset Rule

MVP character images:

```text
/public/characters/*.webp
```

DB stores paths only.

Do not move static Character assets into Convex Storage without approval.

---

## 62. Logging

Log enough identifiers to debug failures:

```text
operation
userId
goalId
cycleId
guestSessionId
errorCode
```

Avoid logging unnecessary free-text user content.

Do not log secrets.

---

## 63. Documentation Sync

If an approved implementation change affects behavior, update the corresponding documentation in the same task.

Examples:

```text
Schema change
→ data-model.md

Domain logic change
→ technical-design.md

Flow change
→ user-flow.md

UI behavior change
→ ui-spec.md

Acceptance change
→ acceptance-criteria.md
```

Do not leave code and docs knowingly inconsistent.

---

## 64. Task Start Checklist

Before coding:

```text
[ ] Read this AGENTS.md
[ ] Read required docs
[ ] Identify relevant Acceptance Criteria IDs
[ ] Identify affected files
[ ] Confirm no forbidden spec changes are required
[ ] Identify tests to add/update
```

---

## 65. Task Completion Checklist

Before reporting completion:

```text
[ ] Implementation matches docs
[ ] Ownership checks are present where required
[ ] Client is not authoritative for rewards
[ ] Invalid state transitions are rejected
[ ] Idempotency considered
[ ] TypeScript passes
[ ] Lint passes
[ ] UI変更時: 色/durationの直書きなし (§55.1, npm run lint:tokens)
[ ] Relevant tests pass
[ ] Existing P0 tests pass
[ ] Docs updated if approved behavior changed
```

---

## 66. Completion Report Format

Every coding-agent completion response should include:

```text
## Implemented
- What changed
- Relevant AC IDs

## Files Changed
- path/to/file

## Tests
- test name: pass/fail

## Verification
- typecheck
- lint
- build

## Remaining Issues
- none / description

## Spec Questions
- none / description
```

Be concise but explicit.

---

## 67. Blocking Rule

If a task requires violating this file or another source-of-truth document:

```text
DO NOT implement the conflicting change.
```

Instead report:

```text
BLOCKED: specification decision required
```

and explain:

```text
current documented rule
requested/required conflicting behavior
affected components
recommended options
```

---

## 68. Core Invariants Summary

These rules must remain true at all times:

```text
1 PDCA Cycle = 1 pdcaCycles record

1 completed PDCA
= XP once
= totalCycles +1 once
= gacha right +1 once

Task success/failure
!= base reward

1 successful Gacha
= 1 draw right consumed
= 1 gachaHistory record

User × Character
= max 1 Inventory record

Server
= authority for rewards

Clerk identity
= authority for current user

AI failure
!= core loop failure

Convex
= source of truth after login
```

---

## 69. Final Rule

When choosing between:

```text
more features
```

and:

```text
a smaller implementation that preserves the documented core loop and data integrity
```

choose the smaller, correct implementation.

The priority is not to make the codebase look sophisticated.

The priority is:

> **Build PDCA GACHA exactly enough that the core loop is reliable, testable, understandable, and safe to extend.**

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
