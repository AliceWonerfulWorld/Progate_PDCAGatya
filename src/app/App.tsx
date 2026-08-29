import { useLocation } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AppRoutes } from '../routes/AppRoutes'

function App() {
  const { pathname } = useLocation()
  // ガチャはBottom Navigationの常設タブになったため、PDCAフロー扱いから外す
  // (以前はPDCA完了直後の演出専用画面だったため、ここでナビを隠していた)。
  const isPdcaFlow = pathname.startsWith('/pdca/')

  return (
    <AppShell showBottomNavigation={!isPdcaFlow}>
      <AppRoutes />
    </AppShell>
  )
}

export default App
