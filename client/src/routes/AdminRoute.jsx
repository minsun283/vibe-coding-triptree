import { Navigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuthUser'

function AdminRoute({ children }) {
  const { user, isAuthChecked, isAdmin } = useAuthUser()

  if (!isAuthChecked) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
