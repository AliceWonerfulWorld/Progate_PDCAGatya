import { useLocation } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AppRoutes } from '../routes/AppRoutes'

function App() {
  const { pathname } = useLocation()
  const isPdcaFlow = pathname.startsWith('/pdca/')

  return (
    <AppShell showBottomNavigation={!isPdcaFlow}>
      <AppRoutes />
    </AppShell>
  )
}

export default App
