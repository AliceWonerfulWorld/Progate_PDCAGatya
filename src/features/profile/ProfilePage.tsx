import { Pencil } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { requiredXpForLevel } from '../../../convex/lib/playerLevel'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'

// ランキング(convex/ranking.ts)に表示する名前。未設定だと「プレイヤー」表記になるため、
// ここで設定できるようにする。
function DisplayNameEditor({ currentUser }: { currentUser: Doc<'users'> }) {
  const setDisplayName = useMutation(api.users.setDisplayName)
  const [isEditing, setIsEditing] = useState(!currentUser.displayName)
  const [value, setValue] = useState(currentUser.displayName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!value.trim()) {
      setError('表示名を入力してください')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await setDisplayName({ displayName: value })
      setIsEditing(false)
    } catch {
      setError('保存できませんでした。もう一度試してください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isEditing) {
    return (
      <button
        className={`flex items-center gap-1.5 text-sm font-semibold text-slate-600 ${SECONDARY_BUTTON_CLASS} border-none px-0`}
        onClick={() => setIsEditing(true)}
        type="button"
      >
        {currentUser.displayName} <Pencil aria-hidden="true" className="size-3.5" />
      </button>
    )
  }

  return (
    <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
      <label className="sr-only" htmlFor="display-name">
        表示名
      </label>
      <input
        autoFocus
        className="min-h-11 w-full max-w-xs border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700"
        id="display-name"
        maxLength={INPUT_LIMITS.displayName}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ランキングに表示する名前"
        value={value}
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <button
          className={`min-h-9 px-4 text-sm font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          disabled={isSubmitting}
          type="submit"
        >
          保存
        </button>
        {currentUser.displayName ? (
          <button
            className={`min-h-9 px-4 text-sm font-semibold ${SECONDARY_BUTTON_CLASS}`}
            onClick={() => {
              setIsEditing(false)
              setValue(currentUser.displayName ?? '')
              setError(null)
            }}
            type="button"
          >
            キャンセル
          </button>
        ) : null}
      </div>
    </form>
  )
}

// docs/ui-spec.md #25 (Profile画面) / AC-PROFILE-001。
function AuthenticatedProfile() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')
  const collection = useQuery(api.characters.listCollection, isReady ? {} : 'skip')

  if (!isSignedIn) return <SignInPrompt message="ログインすると、あなたのPDCAの積み重ねを確認できます。" />
  if (hasError) return <LoadFailure message="プロフィールを読み込めませんでした。" onRetry={retry} />
  if (!isReady || currentUser === undefined || collection === undefined) {
    return <LoadingState label="プロフィールを読み込んでいます。" />
  }

  const { playerLevel, playerXp, currentTitle, totalCycles } = currentUser
  const levelFloorXp = requiredXpForLevel(playerLevel)
  const levelCeilXp = requiredXpForLevel(playerLevel + 1)
  const progressXp = Math.max(0, playerXp - levelFloorXp)
  const progressRange = Math.max(1, levelCeilXp - levelFloorXp)
  const progressPercent = Math.min(100, Math.round((progressXp / progressRange) * 100))

  const partner = collection.find((entry) => entry.isPartner)

  return (
    <div className="space-y-8">
      <DisplayNameEditor currentUser={currentUser} />
      <section className="space-y-2">
        <p className="text-2xl font-bold">Player Lv.{playerLevel}</p>
        <p className="text-sm font-semibold text-slate-600">
          {playerXp.toLocaleString()} / {levelCeilXp.toLocaleString()} XP
        </p>
        <div className="h-2 w-full bg-slate-200">
          <div className="h-2 bg-emerald-700" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <dl className="grid grid-cols-1 gap-6 border-y border-slate-200 py-6">
        <div>
          <dt className="text-sm font-medium text-slate-500">称号</dt>
          <dd className="mt-1 text-lg font-bold">{currentTitle ?? '称号なし'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">現在の相棒</dt>
          <dd className="mt-1 flex items-center gap-3">
            {partner ? (
              <>
                <img
                  alt={partner.character.name}
                  className="size-12 bg-slate-100 object-cover"
                  src={partner.character.imagePath}
                />
                <span className="text-lg font-bold">{partner.character.name}</span>
              </>
            ) : (
              <span className="text-base text-slate-500">未設定</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">累計PDCA</dt>
          <dd className="mt-1 text-lg font-bold">{totalCycles.toLocaleString()}周</dd>
        </div>
      </dl>
    </div>
  )
}

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <SectionHeading>プロフィール</SectionHeading>
      {isClerkConfigured ? (
        <AuthenticatedProfile />
      ) : (
        <p className="text-sm leading-6 text-slate-600">あなたのPDCAの積み重ねが、ここに表示されます。</p>
      )}
    </div>
  )
}
