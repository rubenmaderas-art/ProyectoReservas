import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Register from './components/Register';
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
        {/* Ruta Pública: Login */}
        <Route path="/" element={<Login />} />

        {/* Ruta Pública: Registro */}
        <Route path="/register" element={<Register />} />

        {/* Ruta Pública: Perfil */}
        <Route path="/perfil" element={<Perfil />} />

        <Route
          path="/validaciones"
          element={
            <ProtectedRoute>
              <ValidationsView />
            </ProtectedRoute>
          } />

        {/* Ruta Privada: Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }>
        </Route>

        <Route
          path="/audit-log"
          element={
            <ProtectedRoute>
              <AuditLogView />
            </ProtectedRoute>
          }>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;