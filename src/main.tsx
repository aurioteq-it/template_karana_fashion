import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Storefront, SuccessPage, PolicyPage } from './storefront'
import { AdminAcceptInvite, AdminApp } from './admin'
import { TeamLogin } from './team-login'
import { TeamForgotPassword, TeamResetPassword } from './password-recovery'
import { TrackingConsent } from './tracking'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TrackingConsent />
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/order-success" element={<SuccessPage />} />
        <Route path="/policy/:kind" element={<PolicyPage />} />
        <Route path="/team/access" element={<TeamLogin />} />
        <Route path="/team/forgot-password" element={<TeamForgotPassword />} />
        <Route path="/team/reset-password" element={<TeamResetPassword />} />
        <Route path="/admin/accept-invite" element={<AdminAcceptInvite />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
