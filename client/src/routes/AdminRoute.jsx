import { Navigate, useLocation } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuthUser'
import { buildLoginRedirect } from '@/utils/loginRedirect'

function AdminRoute({ children }) {
  const location = useLocation()
  const { user, isAuthChecked, isAdmin } = useAuthUser()

  if (!isAuthChecked) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={buildLoginRedirect(location)} />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
