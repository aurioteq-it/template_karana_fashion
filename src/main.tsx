import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Storefront, SuccessPage, PolicyPage } from './storefront'
import { AdminAcceptInvite, AdminApp, AdminLogin } from './admin'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/order-success" element={<SuccessPage />} />
        <Route path="/policy/:kind" element={<PolicyPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/accept-invite" element={<AdminAcceptInvite />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
