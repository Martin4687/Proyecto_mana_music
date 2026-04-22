import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import './App.css';
import Productos from './Productos';
import Inventario from './Inventario';
import HistorialInventario from './HistorialInventario';
import Ventas from './Ventas';
import Compras from './Compras';
import OrdenesReabastecimiento from './OrdenesReabastecimiento';
import Proveedores from './Proveedores';
import Usuarios from './Usuarios';
const API_URL = 'http://localhost:8000/api';

// Componentes placeholder para cada módulo
const Reportes = () => <div className="page-content"><h1>📊 Reportes</h1><p>Módulo en construcción...</p></div>;
const ClasificacionABC = () => <div className="page-content"><h1>📈 Clasificación ABC</h1><p>Próximamente...</p></div>;

// ── Página de acceso denegado ─────────────────────────────────
const Denegado = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '70vh', gap: 12,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  }}>
    <div style={{ fontSize: 52 }}>🔒</div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
      Acceso restringido
    </h2>
    <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
      No tienes permisos para ver esta sección.
    </p>
  </div>
);
 
// ── Rutas permitidas por rol ──────────────────────────────────
const RUTAS_VENDEDOR = ['/ventas'];
 
const puedeAcceder = (ruta, rol) => {
  if (rol === 'ADMIN') return true;
  // Vendedor solo puede acceder a ventas
  return RUTAS_VENDEDOR.some((r) => ruta.startsWith(r));
};
 
// ── Componente de ruta protegida por rol ──────────────────────
function RutaProtegida({ path, rol, children }) {
  if (!puedeAcceder(path, rol)) return <Denegado />;
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/auth/verify/`);

        if (response.data.success) {
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error('Token inválido:', error);
        handleLogout();
      }
    }

    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout/`);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const rolRaw = user?.rol || '';
  const esAdmin = rolRaw === 'ADMIN' || rolRaw === 'Administrador';
  const rol = esAdmin ? 'ADMIN' : 'VENDEDOR';
 
  // Ruta de inicio según rol
  const rutaInicio = rol === 'ADMIN' ? '/dashboard' : '/ventas';

  return (
    <Router>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
 
        <main className="main-content">
          <Routes>
            {/* Ruta por defecto según rol */}
            <Route path="/" element={<Navigate to={rutaInicio} replace />} />
 
            {/* Dashboard — solo ADMIN */}
            <Route path="/dashboard" element={
              <RutaProtegida path="/dashboard" rol={rol}>
                <Dashboard user={user} />
              </RutaProtegida>
            } />
 
            {/* Productos — solo ADMIN */}
            <Route path="/productos" element={
              <RutaProtegida path="/productos" rol={rol}>
                <Productos />
              </RutaProtegida>
            } />
 
            {/* Inventario — solo ADMIN */}
            <Route path="/inventario" element={
              <RutaProtegida path="/inventario" rol={rol}>
                <Inventario />
              </RutaProtegida>
            } />
            <Route path="/inventario/historial" element={
              <RutaProtegida path="/inventario" rol={rol}>
                <HistorialInventario />
              </RutaProtegida>
            } />
 
            {/* Ventas — ADMIN y VENDEDOR */}
            <Route path="/ventas" element={<Ventas />} />
 
            {/* Compras — solo ADMIN */}
            <Route path="/compras" element={
              <RutaProtegida path="/compras" rol={rol}>
                <Compras />
              </RutaProtegida>
            } />
            <Route path="/compras/reabastecimiento" element={
              <RutaProtegida path="/compras" rol={rol}>
                <OrdenesReabastecimiento />
              </RutaProtegida>
            } />
 
            {/* Proveedores — solo ADMIN */}
            <Route path="/proveedores" element={
              <RutaProtegida path="/proveedores" rol={rol}>
                <Proveedores />
              </RutaProtegida>
            } />
 
            {/* Reportes — solo ADMIN */}
            <Route path="/reportes" element={
              <RutaProtegida path="/reportes" rol={rol}>
                <Reportes />
              </RutaProtegida>
            } />
 
            {/* Clasificación ABC — solo ADMIN */}
            <Route path="/clasificacion-abc" element={
              <RutaProtegida path="/clasificacion-abc" rol={rol}>
                <ClasificacionABC />
              </RutaProtegida>
            } />
 
            {/* Usuarios — solo ADMIN */}
            <Route path="/usuarios" element={
              <RutaProtegida path="/usuarios" rol={rol}>
                <Usuarios />
              </RutaProtegida>
            } />
 
            
 
            {/* 404 */}
            <Route path="*" element={<Navigate to={rutaInicio} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
 
export default App;