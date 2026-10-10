import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import VerificationGate from './components/VerificationGate.jsx'
import useDashboardRedirect from './hooks/useDashboardRedirect.js'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Browse from './pages/Browse.jsx'
import ResourceDetail from './pages/ResourceDetail.jsx'
import Centers from './pages/Centers.jsx'
import Notifications from './pages/Notifications.jsx'
import SubmitReport from './pages/SubmitReport.jsx'
import Messages from './pages/Messages.jsx'
import Profile from './pages/Profile.jsx'

import DonorDashboard from './pages/DonorDashboard.jsx'
import PostDonation from './pages/PostDonation.jsx'
import MyDonations from './pages/MyDonations.jsx'
import DonorRequests from './pages/DonorRequests.jsx'
import DonationHistory from './pages/DonationHistory.jsx'
import ImpactTracker from './pages/ImpactTracker.jsx'
import Certificates from './pages/Certificates.jsx'

import MyRequests from './pages/MyRequests.jsx'
import RequestResource from './pages/RequestResource.jsx'
import ActiveRequests from './pages/ActiveRequests.jsx'
import ReceivedDonations from './pages/ReceivedDonations.jsx'

import VolunteerDashboard from './pages/VolunteerDashboard.jsx'
import VolunteerProfile from './pages/VolunteerProfile.jsx'

import CenterDashboard from './pages/CenterDashboard.jsx'
import CenterProfile from './pages/CenterProfile.jsx'
import CenterUrgentNeeds from './pages/CenterUrgentNeeds.jsx'
import CenterStatistics from './pages/CenterStatistics.jsx'

import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminCenters from './pages/AdminCenters.jsx'
import AdminCategories from './pages/AdminCategories.jsx'
import AdminModeration from './pages/AdminModeration.jsx'
import AdminReports from './pages/AdminReports.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminNotifications from './pages/AdminNotifications.jsx'

import NotFound from './pages/NotFound.jsx'

export default function App() {
  // Refresh from any page, or browser back/forward from any page, lands a
  // logged-in user on their role's default dashboard.
  useDashboardRedirect()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
          <Route path="/browse/:id" element={<ProtectedRoute><ResourceDetail /></ProtectedRoute>} />
          <Route path="/centers" element={<ProtectedRoute><Centers /></ProtectedRoute>} />

          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['donor', 'recipient', 'volunteer', 'center']}><SubmitReport /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Donors get NO dashboard access at all until admin-verified — not just a gated
              claim step like recipients. Profile (where the ID document is submitted) is a
              separate top-level route and is intentionally not wrapped here. */}
          <Route path="/donor" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><DonorDashboard /></VerificationGate></ProtectedRoute>} />
          <Route path="/donor/post" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><PostDonation /></VerificationGate></ProtectedRoute>} />
          <Route path="/donor/donations" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><MyDonations /></VerificationGate></ProtectedRoute>} />
          <Route path="/donor/requests" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><DonorRequests /></VerificationGate></ProtectedRoute>} />
          <Route path="/donor/history" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><DonationHistory /></VerificationGate></ProtectedRoute>} />
          <Route path="/donor/impact" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><ImpactTracker /></VerificationGate></ProtectedRoute>} />
          <Route path="/donor/certificates" element={<ProtectedRoute roles={['donor']}><VerificationGate roleLabel="donor"><Certificates /></VerificationGate></ProtectedRoute>} />

          {/* Shared between recipient and center — both claim/request resources the same way. */}
          <Route path="/recipient/request-resource" element={<ProtectedRoute roles={['recipient', 'center']}><RequestResource /></ProtectedRoute>} />
          <Route path="/recipient/active" element={<ProtectedRoute roles={['recipient', 'center']}><ActiveRequests /></ProtectedRoute>} />
          <Route path="/recipient/requests" element={<ProtectedRoute roles={['recipient', 'center']}><MyRequests /></ProtectedRoute>} />
          <Route path="/recipient/received" element={<ProtectedRoute roles={['recipient', 'center']}><ReceivedDonations /></ProtectedRoute>} />

          {/* Only task ACCEPTANCE requires admin verification for volunteers — the profile
              and leaderboard pages stay reachable so they can check status and submit their
              document via the shared /profile page. */}
          <Route path="/volunteer" element={<ProtectedRoute roles={['volunteer']}><VerificationGate roleLabel="volunteer"><VolunteerDashboard /></VerificationGate></ProtectedRoute>} />
          <Route path="/volunteer/profile" element={<ProtectedRoute roles={['volunteer']}><VolunteerProfile /></ProtectedRoute>} />

          <Route path="/center" element={<ProtectedRoute roles={['center']}><VerificationGate roleLabel="center coordinator"><CenterDashboard /></VerificationGate></ProtectedRoute>} />
          <Route path="/center/profile" element={<ProtectedRoute roles={['center']}><CenterProfile /></ProtectedRoute>} />
          <Route path="/center/urgent-needs" element={<ProtectedRoute roles={['center']}><CenterUrgentNeeds /></ProtectedRoute>} />
          <Route path="/center/statistics" element={<ProtectedRoute roles={['center']}><CenterStatistics /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/centers" element={<ProtectedRoute roles={['admin']}><AdminCenters /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/moderation" element={<ProtectedRoute roles={['admin']}><AdminModeration /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute roles={['admin']}><AdminNotifications /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
