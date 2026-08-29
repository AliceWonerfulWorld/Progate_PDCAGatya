import { Navigate, Route, Routes } from 'react-router-dom'
import { CollectionPage } from '../features/collection/CollectionPage'
import { CreateGoalPage } from '../features/goals/CreateGoalPage'
import { GoalDetailPage } from '../features/goals/GoalDetailPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { HomePage } from '../features/home/HomePage'
import { CheckPage } from '../features/pdca/CheckPage'
import { DoPage } from '../features/pdca/DoPage'
import { PlanPage } from '../features/pdca/PlanPage'
import { ProfilePage } from '../features/profile/ProfilePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/collection" element={<CollectionPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/goals/new" element={<CreateGoalPage />} />
      <Route path="/goal/:goalId" element={<GoalDetailPage />} />
      <Route path="/pdca/plan/:goalId" element={<PlanPage />} />
      <Route path="/pdca/do/:cycleId" element={<DoPage />} />
      <Route path="/pdca/check/:cycleId" element={<CheckPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
