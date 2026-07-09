/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './hooks/useToast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTenant } from './hooks/useTenant';
import { usePageRegistry } from './hooks/usePageRegistry';
import { Loader2 } from 'lucide-react';

import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';

import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Events from './pages/Events';
import Board from './pages/Board';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import Join from './pages/Join';
import Login from './pages/auth/Login';
import Sponsorship from './pages/Sponsorship';
import Donate from './pages/Donate';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AdminFormBuilder from './pages/admin/AdminFormBuilder';
import AdminFormResponses from './pages/admin/AdminFormResponses';

import PublicForm from './pages/public/PublicForm';
import { AdminTenantProvider } from './contexts/AdminTenantContext';

/** Renders dashboard/admin routes built from page_registry (DB), resolved to real components. */
function DynamicDashboardRoutes() {
  const { tenant } = useTenant();
  const { pages, loading } = usePageRegistry(tenant?.id);

  if (loading) {
    return (
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      } />
    );
  }

  const memberPages = pages.filter(p => p.mode === 'member');
  const adminPages = pages.filter(p => p.mode === 'admin');

  return (
    <>
      {memberPages.map(p => (
        <Route key={`member-${p.pageKey}`} element={<ProtectedRoute pageKey={p.exact ? undefined : p.pageKey} />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index={p.exact} path={p.exact ? undefined : p.path} element={<p.element />} />
          </Route>
        </Route>
      ))}

      {adminPages.map(p => (
        <Route key={`admin-${p.pageKey}`} element={<AdminTenantProvider><ProtectedRoute requireAdmin pageKey={p.exact ? undefined : p.pageKey} /></AdminTenantProvider>}>
          <Route path="/admin" element={<DashboardLayout isAdminMode />}>
            <Route index={p.exact} path={p.exact ? undefined : p.path} element={<p.element />} />
          </Route>
        </Route>
      ))}

      {/* Fixed sub-routes for the built-in Forms page (dynamic :id params can't live in the registry) */}
      <Route element={<AdminTenantProvider><ProtectedRoute requireAdmin pageKey="admin_forms" /></AdminTenantProvider>}>
        <Route path="/admin" element={<DashboardLayout isAdminMode />}>
          <Route path="forms/:id/edit" element={<AdminFormBuilder />} />
          <Route path="forms/:id/responses" element={<AdminFormResponses />} />
        </Route>
      </Route>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TenantProvider>
          <ToastProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/board" element={<Board />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/news/:id" element={<NewsDetail />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/join" element={<Join />} />
                    <Route path="/sponsorship" element={<Sponsorship />} />
                    <Route path="/donate" element={<Donate />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  </Route>

                  {DynamicDashboardRoutes()}

                  <Route path="/forms/:slug" element={<PublicForm />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </ToastProvider>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
