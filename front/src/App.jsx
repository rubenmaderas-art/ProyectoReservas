import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Perfil from './components/Perfil';
import ValidationsView from './components/ValidationsView';
import AuditLogView from './components/AuditLogView';


// Este componente protege las rutas privadas
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Cambiamos "/" por "/login" para que coincida con lo que manda el backend */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        {/* Rutas Protegidas */}
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/validaciones" element={<ProtectedRoute><ValidationsView /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/audit-log" element={<ProtectedRoute><AuditLogView /></ProtectedRoute>} />

        {/* Redirigir cualquier otra cosa al login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;