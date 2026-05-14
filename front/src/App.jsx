import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { clearSessionStorage, getSessionTiming } from './utils/session';
import SessionTimeoutWatcher from './components/SessionTimeoutWatcher';

const Login = lazy(() => import('./components/Login'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const Perfil = lazy(() => import('./components/Perfil'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#F5F4F2] dark:bg-slate-900 z-[9999]">
    <div className="w-8 h-8 border-[3px] border-[#E5007D] border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const hasUser = Boolean(localStorage.getItem('user'));
  const { isExpired } = getSessionTiming();

  if (!hasUser || isExpired) {
    if (isExpired) {
      clearSessionStorage();
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <SessionTimeoutWatcher />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inicio" element={<ProtectedRoute><AdminDashboard initialPage="inicio" /></ProtectedRoute>} />
          <Route path="/vehiculos" element={<ProtectedRoute><AdminDashboard initialPage="vehiculos" /></ProtectedRoute>} />
          <Route path="/reservas" element={<ProtectedRoute><AdminDashboard initialPage="reservas" /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><AdminDashboard initialPage="usuarios" /></ProtectedRoute>} />
          <Route path="/centros" element={<ProtectedRoute><AdminDashboard initialPage="centros" /></ProtectedRoute>} />
          <Route path="/validaciones" element={<ProtectedRoute><AdminDashboard initialPage="validaciones" /></ProtectedRoute>} />
          <Route path="/auditoria" element={<ProtectedRoute><AdminDashboard initialPage="auditoria" /></ProtectedRoute>} />
          <Route path="/mi-perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

          <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
          <Route path="/perfil" element={<Navigate to="/mi-perfil" replace />} />
          <Route path="/revision" element={<Navigate to="/validaciones" replace />} />
          <Route path="/audit-log" element={<Navigate to="/auditoria" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
