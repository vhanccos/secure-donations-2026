import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { ProjectCatalogPage } from './pages/ProjectCatalogPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DonationFlowPage } from './pages/DonationFlowPage';
import { DonorHistoryPage } from './pages/DonorHistoryPage';
import { ProjectManagementPage } from './pages/ProjectManagementPage';
import { AuditEventsPage } from './pages/AuditEventsPage';
import { LoginPage } from './pages/LoginPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            {/* Public Catalog (HU-01) */}
            <Route index element={<ProjectCatalogPage />} />

            {/* Public Project Detail & Stats (HU-02, HU-09) */}
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />

            {/* Donation Flow with Simulation (HU-05, HU-06) */}
            <Route path="donate/:projectId" element={<DonationFlowPage />} />

            {/* Protected: Donor History (HU-07) */}
            <Route
              path="my-donations"
              element={
                <ProtectedRoute allowedRoles={['DONANTE']}>
                  <DonorHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Protected: Gestor Project Management (HU-08) */}
            <Route
              path="admin/projects"
              element={
                <ProtectedRoute allowedRoles={['GESTOR']}>
                  <ProjectManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Protected: Auditor Event Query Inspector (HU-10) */}
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={['AUDITOR']}>
                  <AuditEventsPage />
                </ProtectedRoute>
              }
            />

            {/* Login & MFA Flow (HU-03, HU-11) */}
            <Route path="login" element={<LoginPage />} />

            {/* Error Handlers */}
            <Route path="403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
