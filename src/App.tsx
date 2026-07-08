import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AthletesProvider } from './context/AthletesContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import Layout from './components/Layout'

import DashboardPage from './pages/dashboard/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import AthletesPage from './pages/athletes/AthletesPage'
import AthleteProfilePage from './pages/athletes/AthleteProfilePage'
import StrengthPage from './pages/fitness/strength/StrengthPage'
import FitnessTestingPage from './pages/fitness/testing/FitnessTestingPage'
import FitnessTestConfigPage from './pages/fitness/config/FitnessTestConfigPage'
import InBodyPage from './pages/performance/inbody/InBodyPage'
import SupplementPage from './pages/performance/supplement/SupplementPage'
import PhysioPage from './pages/rehabilitation/physio/PhysioPage'
import PhysioCasePage from './pages/rehabilitation/physio/PhysioCasePage'
import PsychologyRatingPage from './pages/psychology/PsychologyRatingPage'
import ReportsPage from './pages/reports/ReportsPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import AuditLogPage from './pages/admin/AuditLogPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AthletesProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="athletes" element={<ProtectedRoute module="athletes"><AthletesPage /></ProtectedRoute>} />
            <Route path="athletes/:id" element={<ProtectedRoute module="athletes"><AthleteProfilePage /></ProtectedRoute>} />
            <Route path="fitness/strength" element={<ProtectedRoute module="strength"><StrengthPage /></ProtectedRoute>} />
            <Route path="fitness/testing" element={<ProtectedRoute module="fitness"><FitnessTestingPage /></ProtectedRoute>} />
            <Route path="fitness/config" element={<ProtectedRoute module="fitness_config"><FitnessTestConfigPage /></ProtectedRoute>} />
            <Route path="performance/inbody" element={<ProtectedRoute module="inbody"><InBodyPage /></ProtectedRoute>} />
            <Route path="performance/supplement" element={<ProtectedRoute module="supplement"><SupplementPage /></ProtectedRoute>} />
            <Route path="rehabilitation/physio" element={<ProtectedRoute module="physio"><PhysioPage /></ProtectedRoute>} />
            <Route path="rehabilitation/physio/cases" element={<ProtectedRoute module="physio"><PhysioCasePage /></ProtectedRoute>} />
            <Route path="psychology/rating" element={<ProtectedRoute module="psychology"><PsychologyRatingPage /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AthletesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
