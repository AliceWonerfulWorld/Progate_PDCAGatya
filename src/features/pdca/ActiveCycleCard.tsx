import { Link } from 'react-router-dom'
import type { Doc } from '../../../convex/_generated/dataModel'
import { PdcaPhaseIndicator, PHASE_LABEL, type ActivePdcaStatus } from './PdcaPhaseIndicator'

// status ごとの再開先。reload しても保存済み状態から続きを開ける（AC-PDCA-005）。
const RESUME_PATHS = {
  doing: 'do',
  checking: 'check',
  acting: 'act',
} as const

// 「続きを開く」だと今どのフェーズなのかが伝わらないため、現在地に応じた
// 次の一手をラベルにする。
// doing は「実行前」と「実行して報告する段階」の両方を含む（その区別は
// DoPage のローカルstateで、サーバーには持たない）ので、両方を包む語にする。
const RESUME_LABELS = {
  doing: 'DOを開く',
  checking: '振り返る',
  acting: '次のPLANを決める',
} as const

type ActiveCycle = { cycle: Doc<'pdcaCycles'>; goalName: string | null }

function isActiveStatus(status: string): status is ActivePdcaStatus {
  return status in RESUME_PATHS
}

// 進行中Cycleの取得はHomePage側に集約済み。ここは描画だけを持つ。
export function ActiveCycleCard({ active }: { active: ActiveCycle | null }) {
  if (active === null) return null

  const { cycle, goalName } = active
  if (!isActiveStatus(cycle.status)) return null

  return (
    <section aria-labelledby="active-cycle-heading" className="border border-primary-border bg-primary-subtle p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary" id="active-cycle-heading">
          いま {PHASE_LABEL[cycle.status]}
        </p>
        <PdcaPhaseIndicator status={cycle.status} />
      </div>
      {goalName ? <p className="mt-3 text-sm text-text-subtle">{goalName}</p> : null}
      <p className="mt-1 text-base font-bold">{cycle.planText}</p>
      <Link
        className="mt-4 flex min-h-12 items-center justify-center bg-primary px-4 text-base font-bold text-white"
        to={`/pdca/${RESUME_PATHS[cycle.status]}/${cycle._id}`}
      >
        {RESUME_LABELS[cycle.status]}
      </Link>
    </section>
  )
}
