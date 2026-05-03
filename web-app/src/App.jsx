import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import PetProfile       from './pages/PetProfile'
import Schedule         from './pages/Schedule'
import Messages         from './pages/Messages'
import Consultations    from './pages/Consultations'
import VetScheduleSettings from './pages/VetScheduleSettings'
import Settings         from './pages/Settings'
import OwnerMyPets      from './pages/OwnerMyPets'
import OwnerAppointments from './pages/OwnerAppointments'
import BookAppointment  from './pages/BookAppointment'

// Requires a logged-in user of any role
function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

// Requires a specific role; non-matching roles redirect to home
function RoleRoute({ role, children }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== role) return <Navigate to="/" replace />
  return children
}

// PetProfile wrapper — passes readOnly for owners
function PetProfileRoute() {
  const { user } = useAuth()
  return <PetProfile readOnly={user?.role === 'owner'} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Shared routes (both roles) */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/pet/:id" element={<ProtectedRoute><PetProfileRoute /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/consultations" element={<ProtectedRoute><Consultations /></ProtectedRoute>} />

      {/* Vet-only routes */}
      <Route path="/schedule" element={<RoleRoute role="vet"><Schedule /></RoleRoute>} />
      <Route path="/vet-schedule-settings" element={<RoleRoute role="vet"><VetScheduleSettings /></RoleRoute>} />
      <Route path="/settings" element={<RoleRoute role="vet"><Settings /></RoleRoute>} />

      {/* Owner-only routes */}
      <Route path="/my-pets" element={<RoleRoute role="owner"><OwnerMyPets /></RoleRoute>} />
      <Route path="/my-appointments" element={<RoleRoute role="owner"><OwnerAppointments /></RoleRoute>} />
      <Route path="/book-appointment" element={<RoleRoute role="owner"><BookAppointment /></RoleRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
