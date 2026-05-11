import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import Layout from './components/Layout'

import DashboardPage from './pages/dashboard/DashboardPage'
import AthletesPage from './pages/athletes/AthletesPage'
import AthleteProfilePage from './pages/athletes/AthleteProfilePage'
import StrengthPage from './pages/fitness/strength/StrengthPage'
import FitnessTestingPage from './pages/fitness/testing/FitnessTestingPage'
import FitnessTestConfigPage from './pages/fitness/config/FitnessTestConfigPage'
import InBodyPage from './pages/performance/inbody/InBodyPage'
import SupplementPage from './pages/performance/supplement/SupplementPage'
import PhysioPage from './pages/rehabilitation/physio/PhysioPage'
import PhysioCasePage from './pages/rehabilitation/physio/PhysioCasePage'
import ReportsPage from './pages/reports/ReportsPage'
import UserManagementPage from './pages/admin/UserManagementPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="athletes" element={<AthletesPage />} />
            <Route path="athletes/:id" element={<AthleteProfilePage />} />
            <Route path="fitness/strength" element={<StrengthPage />} />
            <Route path="fitness/testing" element={<FitnessTestingPage />} />
            <Route path="fitness/config" element={<FitnessTestConfigPage />} />
            <Route path="performance/inbody" element={<InBodyPage />} />
            <Route path="performance/supplement" element={<SupplementPage />} />
            <Route path="rehabilitation/physio" element={<PhysioPage />} />
            <Route path="rehabilitation/physio/cases" element={<PhysioCasePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute roles={['superadmin', 'admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
