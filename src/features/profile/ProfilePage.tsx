import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { requiredXpForLevel } from '../../../convex/lib/playerLevel'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// docs/ui-spec.md #25 (Profile画面) / AC-PROFILE-001。
function AuthenticatedProfile() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')
  const collection = useQuery(api.characters.listCollection, isReady ? {} : 'skip')

  if (!isSignedIn) return <SignInPrompt message="ログインすると、あなたのPDCAの積み重ねを確認できます。" />
  if (hasError) return <LoadFailure message="プロフィールを読み込めませんでした。" onRetry={retry} />
  if (!isReady || currentUser === undefined || collection === undefined) {
    return <p className="text-sm text-slate-600">読み込んでいます。</p>
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
