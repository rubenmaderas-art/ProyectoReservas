import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Perfil from './components/Perfil';


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
        <Route path="/inicio" element={<ProtectedRoute><AdminDashboard initialPage="inicio" /></ProtectedRoute>} />
        <Route path="/vehiculos" element={<ProtectedRoute><AdminDashboard initialPage="vehiculos" /></ProtectedRoute>} />
        <Route path="/reservas" element={<ProtectedRoute><AdminDashboard initialPage="reservas" /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><AdminDashboard initialPage="usuarios" /></ProtectedRoute>} />
        <Route path="/centros" element={<ProtectedRoute><AdminDashboard initialPage="centros" /></ProtectedRoute>} />
        <Route path="/validaciones" element={<ProtectedRoute><AdminDashboard initialPage="validaciones" /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute><AdminDashboard initialPage="auditoria" /></ProtectedRoute>} />
        <Route path="/mi-perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

        {/* Compatibilidad con rutas antiguas */}
        <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
        <Route path="/perfil" element={<Navigate to="/mi-perfil" replace />} />
        <Route path="/revision" element={<Navigate to="/validaciones" replace />} />
        <Route path="/audit-log" element={<Navigate to="/auditoria" replace />} />

        {/* Redirigir cualquier otra cosa al login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
