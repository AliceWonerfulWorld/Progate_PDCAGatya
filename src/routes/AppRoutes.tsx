import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState'

const CharacterDetailPage = lazy(() => import('../features/collection/CharacterDetailPage').then((module) => ({ default: module.CharacterDetailPage })))
const CollectionPage = lazy(() => import('../features/collection/CollectionPage').then((module) => ({ default: module.CollectionPage })))
const CreateGoalPage = lazy(() => import('../features/goals/CreateGoalPage').then((module) => ({ default: module.CreateGoalPage })))
const GoalDetailPage = lazy(() => import('../features/goals/GoalDetailPage').then((module) => ({ default: module.GoalDetailPage })))
const GachaPage = lazy(() => import('../features/gacha/GachaPage').then((module) => ({ default: module.GachaPage })))
const HistoryPage = lazy(() => import('../features/history/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const HistoryDetailPage = lazy(() => import('../features/history/HistoryDetailPage').then((module) => ({ default: module.HistoryDetailPage })))
const HomePage = lazy(() => import('../features/home/HomePage').then((module) => ({ default: module.HomePage })))
const ActPage = lazy(() => import('../features/pdca/ActPage').then((module) => ({ default: module.ActPage })))
const CheckPage = lazy(() => import('../features/pdca/CheckPage').then((module) => ({ default: module.CheckPage })))
const CompletePage = lazy(() => import('../features/pdca/CompletePage').then((module) => ({ default: module.CompletePage })))
const DoPage = lazy(() => import('../features/pdca/DoPage').then((module) => ({ default: module.DoPage })))
const PlanPage = lazy(() => import('../features/pdca/PlanPage').then((module) => ({ default: module.PlanPage })))
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })))

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState label="画面を読み込んでいます。" />}>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/collection" element={<CollectionPage />} />
      <Route path="/collection/:characterId" element={<CharacterDetailPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/history/:cycleId" element={<HistoryDetailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/goals/new" element={<CreateGoalPage />} />
      <Route path="/goal/:goalId" element={<GoalDetailPage />} />
      <Route path="/pdca/plan/:goalId" element={<PlanPage />} />
      <Route path="/pdca/do/:cycleId" element={<DoPage />} />
      <Route path="/pdca/check/:cycleId" element={<CheckPage />} />
      <Route path="/pdca/act/:cycleId" element={<ActPage />} />
      <Route path="/pdca/complete/:cycleId" element={<CompletePage />} />
      <Route path="/gacha" element={<GachaPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  )
}
