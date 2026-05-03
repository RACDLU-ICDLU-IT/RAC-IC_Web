/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './hooks/useToast';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import DashboardProfile from './pages/dashboard/DashboardProfile';
import DashboardAttendance from './pages/dashboard/DashboardAttendance';
import DashboardProjects from './pages/dashboard/DashboardProjects';
import DashboardCalendar from './pages/dashboard/DashboardCalendar';
import DashboardReminders from './pages/dashboard/DashboardReminders';
import DashboardAnnouncements from './pages/dashboard/DashboardAnnouncements';
import DashboardResources from './pages/dashboard/DashboardResources';

// Public Pages
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

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview';
import AdminSettings from './pages/admin/AdminSettings';
import AdminMembers from './pages/admin/AdminMembers';
import AdminApplications from './pages/admin/AdminApplications';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminEvents from './pages/admin/AdminEvents';
import AdminProjects from './pages/admin/AdminProjects';
import AdminBoard from './pages/admin/AdminBoard';
import AdminNews from './pages/admin/AdminNews';
import AdminGallery from './pages/admin/AdminGallery';
import AdminCommunications from './pages/admin/AdminCommunications';
import AdminReminders from './pages/admin/AdminReminders';
import AdminResources from './pages/admin/AdminResources';
import AdminPages from './pages/admin/AdminPages';
import AdminContactInbox from './pages/admin/AdminContactInbox';
import AdminTheme from './pages/admin/AdminTheme';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes with MainLayout */}
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
                  <Route path="/login" element={<Login />} />
                </Route>

                {/* Secure Dashboard Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="profile" element={<DashboardProfile />} />
                    <Route path="attendance" element={<DashboardAttendance />} />
                    <Route path="projects" element={<DashboardProjects />} />
                    <Route path="calendar" element={<DashboardCalendar />} />
                    <Route path="reminders" element={<DashboardReminders />} />
                    <Route path="announcements" element={<DashboardAnnouncements />} />
                    <Route path="resources" element={<DashboardResources />} />
                  </Route>
                </Route>

                {/* Secure Admin Routes */}
                <Route element={<ProtectedRoute requireAdmin />}>
                  <Route path="/admin" element={<DashboardLayout isAdminMode />}>
                    <Route index element={<AdminOverview />} />
                    <Route path="members" element={<AdminMembers />} />
                    <Route path="applications" element={<AdminApplications />} />
                    <Route path="attendance" element={<AdminAttendance />} />
                    <Route path="events" element={<AdminEvents />} />
                    <Route path="projects" element={<AdminProjects />} />
                    <Route path="board" element={<AdminBoard />} />
                    <Route path="news" element={<AdminNews />} />
                    <Route path="gallery" element={<AdminGallery />} />
                    <Route path="communications" element={<AdminCommunications />} />
                    <Route path="reminders" element={<AdminReminders />} />
                    <Route path="resources" element={<AdminResources />} />
                    <Route path="pages" element={<AdminPages />} />
                    <Route path="contact" element={<AdminContactInbox />} />
                    <Route path="theme" element={<AdminTheme />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
